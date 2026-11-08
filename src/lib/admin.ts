import { env } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// /admin sits behind Cloudflare Access. Access blocks anyone who isn't Devin at the edge,
// but we verify its signed JWT here too, so the page stays locked even if it's reached by a
// route Access doesn't cover (for example the workers.dev URL).

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function isAdmin(request: Request): Promise<boolean> {
  if (import.meta.env.DEV && env.ADMIN_DEV_BYPASS === '1') return true;

  const token = request.headers.get('cf-access-jwt-assertion');
  const team = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!token || !team || !aud) return false;

  jwks ??= createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: aud });
    return true;
  } catch {
    return false;
  }
}
