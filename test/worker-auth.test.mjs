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

test('Bearer 모드에서 토큰을 확인하면 > 유효한 요청을 허용하고 잘못된 요청은 401로 거부한다', async (t) => {
  // Workers exposes this Web Crypto extension. Node provides the equivalent separately.
  if (!crypto.subtle.timingSafeEqual) {
    crypto.subtle.timingSafeEqual = timingSafeEqual;
    t.after(() => { delete crypto.subtle.timingSafeEqual; });
  }
  // given: 기본 Bearer 인증 모드와 유효한 테스트 토큰
  const authenticate = createAuthenticator({ createKeySet: keySetMustNotLoad });
  const env = { MY_CONTEXT_MCP_TOKEN: bearerToken };
  const valid = mcpRequest({ Authorization: `Bearer ${bearerToken}` });

  // when + then: 유효한 요청은 허용, 누락·변조된 요청은 거부
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

test('Access 모드에서 Bearer 또는 잘못된 설정을 사용하면 > 인증을 거부하고 Bearer로 대체하지 않는다', async () => {
  // given: Access 인증 모드가 설정되어 있음
  let keyLoads = 0;
  const authenticate = createAuthenticator({ createKeySet() {
    keyLoads += 1;
    return keySetMustNotLoad();
  } });
  const validBearer = mcpRequest({ Authorization: `Bearer ${bearerToken}` });

  // when + then: Bearer 요청이나 불완전한 설정은 인증되지 않음
  assert.equal((await authenticate(validBearer, accessEnv)).status, 401);
  assert.equal((await authenticate(validBearer, { ...accessEnv, MY_CONTEXT_ACCESS_TEAM_DOMAIN: '' })).status, 503);
  assert.equal((await authenticate(validBearer, { ...accessEnv, MY_CONTEXT_ACCESS_AUD: '' })).status, 503);
  assert.equal((await authenticate(validBearer, { ...accessEnv, MY_CONTEXT_AUTH_MODE: 'other' })).status, 503);
  assert.equal(keyLoads, 0);
});

test('Access 모드에서 JWT를 확인하면 > 올바른 서명·발급자·대상인 요청만 허용한다', async (t) => {
  // given: 로컬 공개키·서명키·검증 대상 클레임
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
  // when + then: 유효한 JWT는 허용
  const valid = await sign();
  assert.equal(await authenticate(accessRequest(valid), accessEnv), null);

  const invalidAssertions = [
    ['서명이 잘못된 경우', await sign({}, untrustedKey)],
    ['대상이 잘못된 경우', await sign({ aud: ['a-different-worker'] })],
    ['발급자가 잘못된 경우', await sign({ iss: 'https://other.cloudflareaccess.com' })],
    ['유효기간이 지난 경우', await sign({ exp: now - 300 })],
    ['아직 유효하지 않은 경우', await sign({ nbf: now + 300 })],
    ['만료 시각이 없는 경우', await sign({ exp: undefined })],
    ['발급자가 없는 경우', await sign({ iss: undefined })],
    ['대상이 없는 경우', await sign({ aud: undefined })],
    ['지원하지 않는 서명 알고리즘인 경우', await new SignJWT(claims).setProtectedHeader({ alg: 'HS256', kid: keyId })
      .sign(new Uint8Array(32).fill(1))],
    ['잘못된 형식인 경우', 'invalid.jwt.fixture'],
  ];
  // when + then: 각 잘못된 JWT는 401로 거부
  for (const [name, assertion] of invalidAssertions) {
    await t.test(name, async () => {
      const request = accessRequest(assertion, { Authorization: `Bearer ${bearerToken}` });
      assert.equal((await authenticate(request, accessEnv)).status, 401);
    });
  }

  assert.equal(await authenticate(accessRequest(valid), accessEnv), null);
  assert.deepEqual(requestedKeyUrls, [`${issuer}/cdn-cgi/access/certs`]);
});
