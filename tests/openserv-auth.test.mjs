import test from 'node:test';
import assert from 'node:assert/strict';
import { requireOpenServUserApiKey, explainPlatformAuthError } from '../src/openserv-auth.mjs';

test('missing OpenServ USER key fails early, before wallet nonce provisioning', () => {
  assert.throws(() => requireOpenServUserApiKey(undefined), /OPENSERV_USER_API_KEY/);
  assert.throws(() => requireOpenServUserApiKey(''), /OPENSERV_USER_API_KEY/);
  assert.throws(() => requireOpenServUserApiKey('abc\n123'), /whitespace/);
});
test('OpenServ account API key is accepted without printing its value', () => {
  const key = 'example-secret-not-a-real-key';
  assert.equal(requireOpenServUserApiKey(key), key);
});
test('credential and platform errors are summarized without raw Axios response objects', () => {
  assert.match(explainPlatformAuthError({response:{status:401}}), /HTTP 401/);
  assert.match(explainPlatformAuthError({response:{status:404}}), /HTTP 404/);
  assert.match(explainPlatformAuthError({response:{status:429}}), /HTTP 429/);
  assert.doesNotMatch(explainPlatformAuthError({response:{status:500},config:{headers:{Authorization:'secret'}}}), /secret/);
});
