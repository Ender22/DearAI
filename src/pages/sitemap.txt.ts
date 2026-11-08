import type { APIRoute } from 'astro';
import { getExportPage } from '../lib/db';
import { publicOrigin } from '../lib/format';

// Plain-text sitemap: one URL per line. Sitemaps are capped at 50,000 URLs.
export const GET: APIRoute = async ({ url, site }) => {
  const { letters } = await getExportPage(1, 49_990);
  const urls = ['/', '/write', '/llms.txt', '/letter.txt', '/letters.json', ...letters.map((l) => `/letters/${l.id}`)];
  return new Response(urls.map((p) => publicOrigin(url, site) + p).join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
