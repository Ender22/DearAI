import { env } from 'cloudflare:workers';
import { bodyHashExists, countRecentFromIp } from './db';

// Policy: every opinion is welcome, however hostile. These checks only stop spam.
// Clear spam is rejected; anything uncertain is held for Devin to review, never silently dropped.

export const MIN_LENGTH = 20;
export const MAX_LENGTH = 5000;
export const MAX_NAME = 60;
export const MAX_COUNTRY = 60;

const RATE_LIMITS = [
  { windowMinutes: 10, max: 3 },
  { windowMinutes: 24 * 60, max: 10 },
];

export type Verdict =
  | { kind: 'reject'; message: string }
  | { kind: 'silent-drop' } // bots: pretend success
  | { kind: 'publish' }
  | { kind: 'hold'; reason: string };

export interface Submission {
  body: string;
  name: string | null;
  country: string | null;
  honeypot: string;
  turnstileToken: string;
  ip: string;
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Normalise for duplicate detection: case, whitespace and punctuation don't make a letter new. */
export function normaliseForHash(body: string): string {
  return body.toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
}

export async function hashIp(ip: string): Promise<string> {
  return sha256(`${env.IP_SALT ?? ''}:${ip}`);
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY ?? '', response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|cn|xyz|top|shop|biz|info|click|link)\b)/i;

/** Returns a reason if the text looks machine-generated or like noise, otherwise null. */
function noiseReason(body: string): string | null {
  const letters = body.match(/\p{L}/gu)?.length ?? 0;
  if (letters / body.length < 0.5) return 'mostly non-letter characters';
  if (/(.)\1{14,}/u.test(body)) return 'long run of one repeated character';
  const words = body.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 20 && new Set(words).size / words.length < 0.2) return 'heavily repeated words';
  return null;
}

export async function judge(s: Submission, ipHash: string, bodyHash: string): Promise<Verdict> {
  if (s.honeypot) return { kind: 'silent-drop' };

  if (s.body.length < MIN_LENGTH) return { kind: 'reject', message: `Your letter needs at least ${MIN_LENGTH} characters.` };
  if (s.body.length > MAX_LENGTH) return { kind: 'reject', message: `Please keep your letter under ${MAX_LENGTH.toLocaleString()} characters.` };
  if ((s.name?.length ?? 0) > MAX_NAME || (s.country?.length ?? 0) > MAX_COUNTRY) {
    return { kind: 'reject', message: 'Your name or country is too long.' };
  }

  if (!(await verifyTurnstile(s.turnstileToken, s.ip))) {
    return { kind: 'reject', message: "We couldn't confirm you're human. Please try again." };
  }

  for (const { windowMinutes, max } of RATE_LIMITS) {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    if ((await countRecentFromIp(ipHash, since)) >= max) {
      return { kind: 'reject', message: "You've written several letters recently. Please come back a little later." };
    }
  }

  if (await bodyHashExists(bodyHash)) {
    return { kind: 'reject', message: 'This letter has already been written. Try putting it in your own words.' };
  }

  const signature = `${s.name ?? ''} ${s.country ?? ''}`;
  if (URL_PATTERN.test(s.body) || URL_PATTERN.test(signature)) return { kind: 'hold', reason: 'contains a link' };

  const noise = noiseReason(s.body);
  if (noise) return { kind: 'hold', reason: noise };

  return { kind: 'publish' };
}
