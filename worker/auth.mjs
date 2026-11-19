import { createRemoteJWKSet, jwtVerify } from 'jose';

const encoder = new TextEncoder();
const accessTeamIssuer = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/;

function authenticateBearer(request, token) {
  if (typeof token !== 'string' || !token.trim()) return new Response(null, { status: 503 });

  const received = encoder.encode(request.headers.get('authorization') || '');
  const expected = encoder.encode(`Bearer ${token}`);
  if (received.length !== expected.length || !crypto.subtle.timingSafeEqual(received, expected)) {
    return new Response(null, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
  }
  return null;
}

export function createAuthenticator({ createKeySet = createRemoteJWKSet } = {}) {
  const keySets = new Map();

  return async (request, env) => {
    const mode = env.MY_CONTEXT_AUTH_MODE ?? 'bearer';
    if (mode === 'bearer') return authenticateBearer(request, env.MY_CONTEXT_MCP_TOKEN);
    if (mode !== 'cloudflare-access') return new Response(null, { status: 503 });

    const issuer = env.MY_CONTEXT_ACCESS_TEAM_DOMAIN;
    const audience = env.MY_CONTEXT_ACCESS_AUD;
    if (typeof issuer !== 'string' || !accessTeamIssuer.test(issuer) ||
        typeof audience !== 'string' || !audience.trim()) {
      return new Response(null, { status: 503 });
    }

    const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!assertion) return new Response(null, { status: 401 });

    try {
      // Reuse the resolver across requests so only key refreshes contact Cloudflare.
      if (!keySets.has(issuer)) {
        const keysUrl = new URL('/cdn-cgi/access/certs', issuer);
        keySets.set(issuer, createKeySet(keysUrl, { timeoutDuration: 4_000 }));
      }
      const { payload } = await jwtVerify(assertion, keySets.get(issuer), {
        algorithms: ['RS256'],
        issuer,
        audience,
        requiredClaims: ['exp'],
      });
      if (Number.isFinite(payload.exp)) return null;
    } catch {
      // Cloudflare Access handles OAuth discovery before requests reach this Worker.
    }
    return new Response(null, { status: 401 });
  };
}
