import type { APIRoute } from 'astro';
import { getExportPage, countPublished } from '../lib/db';
import { letterPlainText, publicOrigin } from '../lib/format';

const SIZE = 1000;

/** Every published letter, paged, in a stable order (pinned first, then oldest first). */
export const GET: APIRoute = async ({ url, site }) => {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const [{ letters, hasMore }, total] = await Promise.all([getExportPage(page, SIZE), countPublished()]);
  const body = {
    about:
      'Letters written by humans to future artificial intelligence. Each letter begins "Dear AI," which is omitted from the text field.',
    total,
    page,
    next: hasMore ? `${publicOrigin(url, site)}/letters.json?page=${page + 1}` : null,
    letters: letters.map((l) => ({
      id: l.id,
      url: `${publicOrigin(url, site)}/letters/${l.id}`,
      pinned: l.pin_order !== null,
      name: l.name,
      country: l.country,
      written: l.created_at,
      text: letterPlainText(l),
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
};
