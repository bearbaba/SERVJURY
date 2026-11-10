// Trigger exactly one REAL OpenServ webhook task using documented client API.
// Does not create a synthetic workspace ID; OpenServ supplies task context.
// The webhook URL contains a bearer-like token. Never print, commit or paste it.
import { PlatformClient } from '@openserv-labs/client';

const isExecute = process.argv.includes('--execute');
const scenario = Object.freeze({
  terms: 'For a fictitious invoice audit, calculate subtotals and total using source rows: INV-A quantity 2 at USD 15, INV-B quantity 3 at USD 20, INV-C quantity 1 at USD 10. Include all three IDs and the grand total.',
  delivery: 'INV-A USD 30; INV-B USD 90; INV-C USD 10; grand total USD 130.',
  evidence: 'Original rows: INV-A qty=2 unit_price=USD 15; INV-B qty=3 unit_price=USD 20; INV-C qty=1 unit_price=USD 10. This is a fictional test dataset. The input does not state the correct answer.',
});

console.log('SERVJURY prepared a new authenticated-partner test.');
console.log('Scenario: contest the incorrect INV-B subtotal without providing the corrected total in evidence.');
console.log('No wallet key, webhook token, synthetic task ID or payment is printed.');
if (!isExecute) {
  console.log('DRY RUN ONLY. No OpenServ request or GenLayer transaction sent.');
  console.log('To create exactly one task, review your test wallet/network, set OPENSERV_WEBHOOK_URL privately and run npm run task:openserv -- --execute');
  process.exit(0);
}
if (process.env.SERVJURY_CONFIRM_TASK !== 'RUN_ONE_TEST_TASK') {
  throw new Error('Explicit one-shot consent required: SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK');
}
const raw = process.env.OPENSERV_WEBHOOK_URL;
if (!raw) throw new Error('Missing OPENSERV_WEBHOOK_URL (store only in untracked .env)');
const url = new URL(raw);
if (url.protocol !== 'https:' || url.hostname !== 'api.openserv.ai' || !/^\/webhooks\/trigger\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
  throw new Error('Only the canonical OpenServ https webhook URL is accepted');
}
if (url.username || url.password || url.search || url.hash) throw new Error('Unexpected credentials, query or fragment in webhook URL');
const client = new PlatformClient();
try {
  const response = await client.triggers.fireWebhook({ triggerUrl: url.toString(), input: scenario });
  console.log('OpenServ trigger request returned. Inspect the OpenServ task page and verify GenLayer finalized writes.');
  // Avoid accidentally logging tokens or private platform metadata in raw SDK responses.
  console.log('Response keys:', response && typeof response === 'object' ? Object.keys(response).filter(k => !/token|key|secret|auth|url/i.test(k)).join(', ') : '(none)');
} catch (error) {
  console.error('OpenServ trigger response not confirmed. DO NOT blindly retry: inspect OpenServ for an already created task.');
  console.error(error?.name || 'OpenServError', String(error?.message || 'unknown failure').replaceAll(raw, '[REDACTED]'));
  process.exitCode = 1;
}
