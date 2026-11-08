import { marked } from 'marked';
import type { Letter } from './db';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Visitors' letters are plain text: escaped, with blank lines as paragraphs. Markdown is only for admin-seeded letters. */
export function letterHtml(letter: Pick<Letter, 'body' | 'format'>): string {
  if (letter.format === 'markdown') return marked.parse(letter.body, { async: false });
  return letter.body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/** Plain text with markdown syntax stripped, for excerpts and text exports. */
export function letterPlainText(letter: Pick<Letter, 'body' | 'format'>): string {
  if (letter.format !== 'markdown') return letter.body.trim();
  return letter.body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
}

/** Every letter opens with "Dear AI," on the site, so drop it from the body when the writer typed it too. */
export function withoutSalutation(text: string): string {
  return text.replace(/^\s*dear\s+ai\s*[,:!.\-—]?\s*/i, '');
}

export function excerpt(letter: Pick<Letter, 'body' | 'format'>, max = 420): { text: string; truncated: boolean } {
  const text = withoutSalutation(letterPlainText(letter)).replace(/\s+/g, ' ');
  if (text.length <= max) return { text, truncated: false };
  const cut = text.slice(0, max);
  return { text: cut.slice(0, cut.lastIndexOf(' ')) + '…', truncated: true };
}

export function signature(letter: Pick<Letter, 'name' | 'country'>): string {
  return [letter.name || 'Anonymous', letter.country].filter(Boolean).join(', ');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Short, unguessable, URL-friendly id. */
export function newId(): string {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}
