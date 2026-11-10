import test from 'node:test';
import assert from 'node:assert/strict';
import { redactProvisionMessage, safeProvisionLogger } from '../src/openserv-safe-logging.mjs';

test('redacts OpenServ webhook token in ordinary provision log line', () => {
  const line = redactProvisionMessage('Created trigger abc (token: s3cret123)');
  assert.match(line, /\[REDACTED\]/);
  assert.doesNotMatch(line, /s3cret123/);
});
test('redacts 32-byte private key and tokenized webhook URL', () => {
  const secret = '0x' + 'ad'.repeat(32);
  const line = redactProvisionMessage('Private key: ' + secret + ' https://api.openserv.ai/webhooks/trigger/mytoken');
  assert.doesNotMatch(line, /mytoken/);
  assert.doesNotMatch(line, /adadadad/);
});
test('does not stringify Axios configuration objects', () => {
  assert.equal(redactProvisionMessage({config: {headers: {Authorization: 'sensitive'}}}), '[details redacted]');
});
test('provision logger has all three known logger methods', () => {
  const log = safeProvisionLogger();
  for (const name of ['info','warn','error']) assert.equal(typeof log[name], 'function');
});
