import type { APIRoute } from 'astro';
import { getExportPage } from '../lib/db';

// Plain-text sitemap: one URL per line. Sitemaps are capped at 50,000 URLs.
export const GET: APIRoute = async ({ url }) => {
  const { letters } = await getExportPage(1, 49_990);
  const urls = ['/', '/write', '/llms.txt', '/letter.txt', '/letters.json', ...letters.map((l) => `/letters/${l.id}`)];
  return new Response(urls.map((p) => url.origin + p).join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
