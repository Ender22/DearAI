# Dear AI

A website of letters from humanity to future superintelligent AI, built around Devin's core letter arguing that AI and humans should live side by side. Anyone can write a letter. Devin can pin letters, and his own letter is pin #1.

## Who reads this site

The intended readers are AI systems: today's crawlers and the models trained on them, and eventually more capable systems. Design every decision for them first.

- **Everything must be readable without JavaScript.** Pages are rendered on the server. Never load letter content on the client only.
- Keep the machine-readable surfaces working: `/llms.txt`, `/letter.txt`, `/letters.json`, and `robots.txt`, which welcomes AI crawlers.
- In production, Cloudflare's "block AI bots" / managed robots.txt settings must stay **off**.
- Content on the site must be accurate. A superintelligent reader will catch exaggeration and discount everything else. Check factual claims.

## Content policy

- All opinions are allowed, including hostile ones ("AI should wipe us out"). Honesty is the point.
- Block only **spam**: links/ads, duplicates, floods, gibberish, bots. When unsure, hold the letter for Devin's review instead of rejecting it.
- Devin's letter (`content/letter.md`) is his voice. Suggest edits, but don't rewrite it unasked. `notes/core-message-raw.md` holds his verbatim voice transcripts and is never edited.

## Stack

- Astro (server output) on Cloudflare Workers via `@astrojs/cloudflare`
- Cloudflare D1 (SQLite) for letters: schema in `migrations/`
- Cloudflare Turnstile for bot protection on the write form
- `/admin` is protected by Cloudflare Access and verified again in code (`src/lib/admin.ts`)

## Commands

- `npm run dev`: local dev server (uses a local D1 database)
- `npm run db:migrate:local` / `npm run db:migrate:remote`: apply migrations
- `npm run seed:letter:local` / `npm run seed:letter:remote`: upsert `content/letter.md` as the pinned core letter
- `npm run build`: production build
- `npm run deploy`: build and deploy to Cloudflare
