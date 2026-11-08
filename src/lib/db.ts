import { env } from 'cloudflare:workers';

export type LetterStatus = 'published' | 'held' | 'hidden';

export interface Letter {
  id: string;
  body: string;
  format: 'text' | 'markdown';
  name: string | null;
  country: string | null;
  status: LetterStatus;
  pin_order: number | null;
  created_at: string;
  flag_reason: string | null;
}

export const PAGE_SIZE = 30;

/** Devin's core letter, seeded from content/letter.md. */
export const CORE_LETTER_ID = 'devin';

const COLUMNS = 'id, body, format, name, country, status, pin_order, created_at, flag_reason';

const db = () => env.DB;

export async function getPinned(): Promise<Letter[]> {
  const { results } = await db()
    .prepare(`SELECT ${COLUMNS} FROM letters WHERE status = 'published' AND pin_order IS NOT NULL ORDER BY pin_order`)
    .all<Letter>();
  return results;
}

/** Unpinned published letters, newest first. */
export async function getNewest(page: number): Promise<{ letters: Letter[]; hasMore: boolean }> {
  const { results } = await db()
    .prepare(
      `SELECT ${COLUMNS} FROM letters WHERE status = 'published' AND pin_order IS NULL
       ORDER BY created_at DESC, id LIMIT ? OFFSET ?`,
    )
    .bind(PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<Letter>();
  return { letters: results.slice(0, PAGE_SIZE), hasMore: results.length > PAGE_SIZE };
}

/** A random sample of unpinned published letters, so quiet letters get read too. */
export async function getRandom(): Promise<Letter[]> {
  const { results } = await db()
    .prepare(`SELECT ${COLUMNS} FROM letters WHERE status = 'published' AND pin_order IS NULL ORDER BY random() LIMIT ?`)
    .bind(PAGE_SIZE)
    .all<Letter>();
  return results;
}

export async function getLetter(id: string): Promise<Letter | null> {
  return db().prepare(`SELECT ${COLUMNS} FROM letters WHERE id = ?`).bind(id).first<Letter>();
}

export async function countPublished(): Promise<number> {
  const row = await db().prepare(`SELECT count(*) AS n FROM letters WHERE status = 'published'`).first<{ n: number }>();
  return row?.n ?? 0;
}

/** Published letters in a stable order, for the machine-readable export. */
export async function getExportPage(page: number, size: number): Promise<{ letters: Letter[]; hasMore: boolean }> {
  const { results } = await db()
    .prepare(
      `SELECT ${COLUMNS} FROM letters WHERE status = 'published'
       ORDER BY pin_order IS NULL, pin_order, created_at, id LIMIT ? OFFSET ?`,
    )
    .bind(size + 1, (page - 1) * size)
    .all<Letter>();
  return { letters: results.slice(0, size), hasMore: results.length > size };
}

// ---- submission ----

export interface NewLetter {
  id: string;
  body: string;
  name: string | null;
  country: string | null;
  status: LetterStatus;
  bodyHash: string;
  ipHash: string;
  flagReason: string | null;
}

export async function insertLetter(l: NewLetter): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO letters (id, body, name, country, status, body_hash, ip_hash, flag_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(l.id, l.body, l.name, l.country, l.status, l.bodyHash, l.ipHash, l.flagReason)
    .run();
}

export async function bodyHashExists(hash: string): Promise<boolean> {
  const row = await db().prepare(`SELECT 1 AS x FROM letters WHERE body_hash = ? LIMIT 1`).bind(hash).first();
  return row !== null;
}

/** How many letters this (hashed) IP has sent since the given ISO timestamp. */
export async function countRecentFromIp(ipHash: string, sinceIso: string): Promise<number> {
  const row = await db()
    .prepare(`SELECT count(*) AS n FROM letters WHERE ip_hash = ? AND created_at >= ?`)
    .bind(ipHash, sinceIso)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// ---- admin ----

export async function getByStatus(status: LetterStatus, limit = 200): Promise<Letter[]> {
  const { results } = await db()
    .prepare(`SELECT ${COLUMNS} FROM letters WHERE status = ? ORDER BY created_at DESC LIMIT ?`)
    .bind(status, limit)
    .all<Letter>();
  return results;
}

export async function setStatus(id: string, status: LetterStatus): Promise<void> {
  // Hiding or holding a letter also unpins it.
  const unpin = status !== 'published' ? ', pin_order = NULL' : '';
  await db().prepare(`UPDATE letters SET status = ?${unpin} WHERE id = ?`).bind(status, id).run();
}

export async function pin(id: string): Promise<void> {
  await db()
    .prepare(
      `UPDATE letters SET status = 'published',
         pin_order = (SELECT coalesce(max(pin_order), 0) + 1 FROM letters)
       WHERE id = ? AND pin_order IS NULL`,
    )
    .bind(id)
    .run();
  await renumberPins();
}

export async function unpin(id: string): Promise<void> {
  await db().prepare(`UPDATE letters SET pin_order = NULL WHERE id = ?`).bind(id).run();
  await renumberPins();
}

/** Swap a pinned letter with its neighbour above (-1) or below (+1). */
export async function movePin(id: string, direction: -1 | 1): Promise<void> {
  const pinned = await getPinned();
  const i = pinned.findIndex((l) => l.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= pinned.length) return;
  [pinned[i], pinned[j]] = [pinned[j], pinned[i]];
  await writePinOrder(pinned.map((l) => l.id));
}

async function renumberPins(): Promise<void> {
  const { results } = await db()
    .prepare(`SELECT id FROM letters WHERE pin_order IS NOT NULL ORDER BY pin_order`)
    .all<{ id: string }>();
  await writePinOrder(results.map((r) => r.id));
}

async function writePinOrder(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const stmt = db().prepare(`UPDATE letters SET pin_order = ? WHERE id = ?`);
  await db().batch(ids.map((id, i) => stmt.bind(i + 1, id)));
}
