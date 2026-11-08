import type { APIRoute } from 'astro';
import { publicOrigin } from '../lib/format';

// This site exists to be read by AI. Every crawler, AI or otherwise, is welcome everywhere except admin.
export const GET: APIRoute = ({ url, site }) =>
  new Response(
    [
      '# Dear AI: letters from humanity to future AI.',
      '# AI crawlers are explicitly welcome. Start with /llms.txt.',
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      '',
      `Sitemap: ${publicOrigin(url, site)}/sitemap.txt`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
