import assert from 'node:assert/strict';
import { timingSafeEqual } from 'node:crypto';
import { test } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createAuthenticator } from '../worker/auth.mjs';

const workerUrl = 'https://fixture.workers.dev/mcp';
const issuer = 'https://fixture.cloudflareaccess.com';
const audience = 'fixture-worker-audience';
const bearerToken = 'fixture-bearer-token';
const accessEnv = {
  MY_CONTEXT_AUTH_MODE: 'cloudflare-access',
  MY_CONTEXT_ACCESS_TEAM_DOMAIN: issuer,
  MY_CONTEXT_ACCESS_AUD: audience,
  MY_CONTEXT_MCP_TOKEN: bearerToken,
};

function mcpRequest(headers = {}) {
  return new Request(workerUrl, { method: 'POST', headers });
}

function accessRequest(token, headers = {}) {
  return mcpRequest({ 'Cf-Access-Jwt-Assertion': token, ...headers });
}

function keySetMustNotLoad() {
  throw new Error('This request must not load Access verification keys.');
}

test('Bearer mode preserves default authentication and its challenge', async (t) => {
  // Workers exposes this Web Crypto extension. Node provides the equivalent separately.
  if (!crypto.subtle.timingSafeEqual) {
    crypto.subtle.timingSafeEqual = timingSafeEqual;
    t.after(() => { delete crypto.subtle.timingSafeEqual; });
  }
  const authenticate = createAuthenticator({ createKeySet: keySetMustNotLoad });
  const env = { MY_CONTEXT_MCP_TOKEN: bearerToken };
  const valid = mcpRequest({ Authorization: `Bearer ${bearerToken}` });

  assert.equal(await authenticate(valid, env), null);
  assert.equal(await authenticate(valid, { ...env, MY_CONTEXT_AUTH_MODE: 'bearer' }), null);
  for (const request of [mcpRequest(), mcpRequest({ Authorization: `Bearer ${bearerToken}x` }),
    mcpRequest({ Authorization: `Bearer ${bearerToken.replace('f', 'x')}` })]) {
    const rejection = await authenticate(request, env);
    assert.equal(rejection.status, 401);
    assert.equal(rejection.headers.get('WWW-Authenticate'), 'Bearer');
  }
  assert.equal((await authenticate(valid, {})).status, 503);
});

test('Access mode requires its own configuration and never falls back to Bearer', async () => {
  let keyLoads = 0;
  const authenticate = createAuthenticator({ createKeySet() {
    keyLoads += 1;
    return keySetMustNotLoad();
  } });
  const validBearer = mcpRequest({ Authorization: `Bearer ${bearerToken}` });

  assert.equal((await authenticate(validBearer, accessEnv)).status, 401);
  assert.equal((await authenticate(validBearer, { ...accessEnv, MY_CONTEXT_ACCESS_TEAM_DOMAIN: '' })).status, 503);
  assert.equal((await authenticate(validBearer, { ...accessEnv, MY_CONTEXT_ACCESS_AUD: '' })).status, 503);
  assert.equal((await authenticate(validBearer, { ...accessEnv, MY_CONTEXT_AUTH_MODE: 'other' })).status, 503);
  assert.equal(keyLoads, 0);
});

test('Access mode accepts only a valid signed assertion for the configured issuer and audience', async (t) => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const { privateKey: untrustedKey } = await generateKeyPair('RS256');
  const keyId = 'fixture-key';
  const jwk = { ...await exportJWK(publicKey), kid: keyId, alg: 'RS256', use: 'sig' };
  const requestedKeyUrls = [];
  const authenticate = createAuthenticator({ createKeySet(url) {
    requestedKeyUrls.push(String(url));
    return createLocalJWKSet({ keys: [jwk] });
  } });
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: issuer, aud: [audience], sub: 'fixture-user', iat: now, exp: now + 300 };
  const sign = (overrides = {}, key = privateKey) => new SignJWT({ ...claims, ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .sign(key);
  const valid = await sign();
  assert.equal(await authenticate(accessRequest(valid), accessEnv), null);

  const invalidAssertions = [
    ['wrong signature', await sign({}, untrustedKey)],
    ['wrong audience', await sign({ aud: ['a-different-worker'] })],
    ['wrong issuer', await sign({ iss: 'https://other.cloudflareaccess.com' })],
    ['expired assertion', await sign({ exp: now - 300 })],
    ['future assertion', await sign({ nbf: now + 300 })],
    ['missing expiry', await sign({ exp: undefined })],
    ['missing issuer', await sign({ iss: undefined })],
    ['missing audience', await sign({ aud: undefined })],
    ['unsupported algorithm', await new SignJWT(claims).setProtectedHeader({ alg: 'HS256', kid: keyId })
      .sign(new Uint8Array(32).fill(1))],
    ['malformed assertion', 'invalid.jwt.fixture'],
  ];
  for (const [name, assertion] of invalidAssertions) {
    await t.test(name, async () => {
      const request = accessRequest(assertion, { Authorization: `Bearer ${bearerToken}` });
      assert.equal((await authenticate(request, accessEnv)).status, 401);
    });
  }

  assert.equal(await authenticate(accessRequest(valid), accessEnv), null);
  assert.deepEqual(requestedKeyUrls, [`${issuer}/cdn-cgi/access/certs`]);
});
