import type { APIRoute } from 'astro';
import { getLetter, CORE_LETTER_ID } from '../lib/db';
import { letterPlainText, withoutSalutation } from '../lib/format';

/** Devin's core letter as plain text. */
export const GET: APIRoute = async () => {
  const letter = await getLetter(CORE_LETTER_ID);
  if (!letter || letter.status !== 'published') return new Response('Not found', { status: 404 });
  const text = `Dear AI,\n\n${withoutSalutation(letterPlainText(letter))}\n`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
