// Trigger exactly one REAL OpenServ webhook task using documented client API.
// Does not create a synthetic workspace ID; OpenServ supplies task context.
// The webhook URL contains a bearer-like token. Never print, commit or paste it.
import { existsSync, readFileSync } from 'node:fs';
import { requireOpenServUserApiKey } from '../src/openserv-auth.mjs';
import { summarizeTriggerResult } from '../src/openserv-trigger-result.mjs';

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
  console.log('To create exactly one task, provision OpenServ with npm run agent, verify all exposed credentials have been rotated, then run --execute with SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK.');
  process.exit(0);
}
if (process.env.SERVJURY_CONFIRM_TASK !== 'RUN_ONE_TEST_TASK') {
  throw new Error('Explicit one-shot consent required: SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK');
}
// The API key stays in an encrypted Codespaces Secret. Resolve the webhook
// token privately from the registered workflow ID; neither the token nor
// OpenServ's response body is printed or stored in a plaintext trigger file.
const userApiKey = requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY);
let workflowId = Number(process.env.OPENSERV_WORKFLOW_ID || 0);
if (!workflowId && existsSync('.openserv.json')) {
  const state = JSON.parse(readFileSync('.openserv.json', 'utf8'));
  workflowId = Number(state?.workflows?.['SERVJURY — Internet Court Review']?.['SERVJURY Delivery Review']?.workspaceId || 0);
}
if (!Number.isSafeInteger(workflowId) || workflowId <= 0) {
  throw new Error('Missing valid OpenServ workflow ID. Provision agent once or set OPENSERV_WORKFLOW_ID explicitly.');
}
const { PlatformClient } = await import('@openserv-labs/client');
const client = new PlatformClient({ apiKey: userApiKey });
try {
  const response = await client.triggers.fireWebhook({ workflowId, input: scenario });
  const summary = summarizeTriggerResult(response);
  console.log('OpenServ trigger result (sanitized):', JSON.stringify(summary));
  if (summary.result === 'ERROR') {
    console.error('OpenServ reported an application-level error. The webhook MAY have created a session. DO NOT retry until the original execution is inspected.');
    process.exitCode = 1;
  } else if (summary.result !== 'ACKNOWLEDGED_NOT_VERIFIED') {
    console.warn('Webhook completion not confirmed. DO NOT retry blindly; inspect workflow sessions and task activities.');
    process.exitCode = 2;
  } else {
    console.log('OpenServ acknowledged webhook response. This is NOT evidence of a finalized GenLayer judgment or OpenServ task log.');
  }
} catch (error) {
  console.error('OpenServ trigger response not confirmed. DO NOT blindly retry: inspect OpenServ for an already created task.');
  const status = Number(error?.response?.status);
  console.error(status > 0 ? `OpenServ HTTP ${status}` : 'OpenServ trigger failed (details withheld to protect credentials).');
  process.exitCode = 1;
}
