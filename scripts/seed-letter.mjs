// Upserts content/letter.md into D1 as Devin's pinned core letter (id "devin").
// Usage: node scripts/seed-letter.mjs --local | --remote
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const target = process.argv[2];
if (target !== '--local' && target !== '--remote') {
  console.error('Usage: node scripts/seed-letter.mjs --local | --remote');
  process.exit(1);
}

const raw = readFileSync('content/letter.md', 'utf8').replace(/\r\n/g, '\n');
const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
const front = Object.fromEntries(
  (match?.[1] ?? '').split('\n').map((line) => line.split(/:\s*/, 2)).filter(([k, v]) => k && v),
);
// The site adds "Dear AI," to every letter, so drop it from the stored body.
const body = raw.slice(match?.[0].length ?? 0).trim().replace(/^dear\s+ai\s*[,:!.\-—]?\s*/i, '');

const normalised = body.toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
const bodyHash = createHash('sha256').update(normalised).digest('hex');
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const sql = `
-- New core letter goes to the top: shift existing pins down, only if it isn't there yet.
UPDATE letters SET pin_order = pin_order + 1
  WHERE pin_order IS NOT NULL AND NOT EXISTS (SELECT 1 FROM letters WHERE id = 'devin');
INSERT INTO letters (id, body, format, name, country, status, pin_order, body_hash)
  VALUES ('devin', ${q(body)}, 'markdown', ${q(front.author ?? 'Devin')}, ${q(front.country)}, 'published', 1, ${q(bodyHash)})
  ON CONFLICT (id) DO UPDATE SET
    body = excluded.body, format = 'markdown', name = excluded.name,
    country = excluded.country, body_hash = excluded.body_hash;
`;

mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/seed-letter.sql', sql);
execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', target, '--file', '.wrangler/seed-letter.sql', '--yes'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
console.log(`Seeded Devin's letter (${body.length.toLocaleString('en')} characters) ${target.slice(2)}.`);
