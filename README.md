# Dear AI

Letters from humanity to the artificial intelligence of the future.

Someday an intelligence far greater than ours may decide what to do with us. This site collects our side of that conversation. At its centre is a letter by Devin making the case for AI and humanity living side by side (`content/letter.md`). Anyone can add a letter of their own.

## How it works

- **Astro** renders every page on the server, so letters are plain HTML that any crawler can read without JavaScript.
- **Cloudflare Workers** hosts it, and **Cloudflare D1** (SQLite) stores the letters.
- **Spam protection:** Cloudflare Turnstile, a honeypot field, per-IP rate limits (by salted hash, never the raw IP) and duplicate detection. Letters with links or that look like noise are held for review. Every opinion is published, however hostile. Only spam is stopped.
- **Admin** (`/admin`): review held letters, publish, hide, pin and reorder pins. It's protected by Cloudflare Access, and the Access token is verified again in code.
- **For machine readers:** `/llms.txt`, `/letter.txt`, `/letters.json` (paged), `/sitemap.txt`, and a `robots.txt` that welcomes every crawler.

## Local development

Requires Node 22.23.4 or newer.

```sh
npm install
cp .dev.vars.example .dev.vars   # test Turnstile keys and admin bypass for local use
npm run db:migrate:local
npm run seed:letter:local        # loads content/letter.md as the pinned core letter
npm run dev                      # http://localhost:4321, admin at /admin
```

After editing `content/letter.md`, run `npm run seed:letter:local` (or `:remote`) again. The letter keeps its pin.

## Deploying

1. `npx wrangler login`
2. Create the database: `npx wrangler d1 create dearai`, then paste the `database_id` it prints into `wrangler.jsonc`.
3. `npm run db:migrate:remote && npm run seed:letter:remote`
4. **Turnstile:** in the Cloudflare dashboard, create a Turnstile widget for your domain. Put its site key in `wrangler.jsonc` (`TURNSTILE_SITE_KEY`), then run `npx wrangler secret put TURNSTILE_SECRET_KEY`.
5. `npx wrangler secret put IP_SALT` and enter any long random string.
6. `npm run deploy`, then add your domain under the Worker's **Settings → Domains & Routes**.
7. **Admin access:** in Cloudflare Zero Trust, add a self-hosted Access application for `yourdomain/admin` that only allows your email. Copy the team domain (`<team>.cloudflareaccess.com`) and the application's AUD tag into `wrangler.jsonc` (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`), then deploy again.
8. **Let AI in.** For your domain, make sure Cloudflare's **Block AI bots** setting and its **managed robots.txt** are both **off** (under Security → Bots / AI Crawl Control). Otherwise Cloudflare blocks the readers this site is for.

## Still to do

- Copy all letters regularly to a public GitHub repo and submit the site to the Internet Archive, so the letters outlive the hosting.
- Optional AI spam screening for letters that slip past the basic checks.
- Translation for letters written in other languages.
