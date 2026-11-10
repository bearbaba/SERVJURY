// Authenticated OpenServ capability. Do not confuse its SDK task context with
// synthetic Studio fixture task IDs. No funds, escrow or automatic payouts.
import { Agent, run } from '@openserv-labs/sdk';
import { PlatformClient, provision, triggers, setLogger } from '@openserv-labs/client';
import { safeProvisionLogger } from '../src/openserv-safe-logging.mjs';
import { requireOpenServUserApiKey, explainPlatformAuthError } from '../src/openserv-auth.mjs';
import { z } from 'zod';
import { fileLiveCase, judgeLiveCase, readLiveCase } from '../src/genlayer.mjs';
import { validateCase } from '../src/engine.mjs';
import { runTaskReview } from '../src/openserv-bridge.mjs';

if (process.env.ENABLE_LIVE_TRANSACTIONS !== '1') {
  throw new Error('Set ENABLE_LIVE_TRANSACTIONS=1 with an explicit GenLayer network and dedicated test signer.');
}

const agent = new Agent({
  systemPrompt: 'You are SERVJURY, a neutral delivery-review relay. Never invent or revise an on-chain verdict. Only report finalized chain state.',
});
agent.addCapability({
  name: 'adjudicate_delivery',
  description: 'Adjudicate the submitted delivery of an authenticated OpenServ task using GenLayer and write the final verdict to that task log.',
  inputSchema: z.object({
    terms: z.string().min(1).max(2000),
    delivery: z.string().min(1).max(4000),
    evidence: z.string().min(1).max(4000),
  }),
  async run({ args, action }) {
    if (action?.task?.id === undefined || action?.workspace?.id === undefined) {
      throw new Error('Authenticated OpenServ task and workspace context required.');
    }
    const workspaceId = action.workspace.id;
    const taskId = action.task.id;
    const input = validateCase({ ...args, taskId: String(taskId) });
    const receipt = await runTaskReview({
      workspaceId, taskId, input,
      allowFirstFiling: process.env.ALLOW_FIRST_FILING === '1',
      readCase: readLiveCase,
      fileCase: fileLiveCase,
      judgeCase: judgeLiveCase,
    });
    // The log is the partner writeback, not an automatic payment or task completion.
    // The deterministic receiptId enables manual de-duplication in a task audit.
    await this.addLogToTask({
      workspaceId, taskId,
      severity: receipt.verdict === 'ACCEPT' ? 'info' : 'warning',
      type: 'text', body: JSON.stringify(receipt),
    });
    return JSON.stringify(receipt);
  },
});

// OpenServ account authentication is separate from GENLAYER_PRIVATE_KEY.
// The OpenServ SIWE nonce route returned 404 in the operator's live run.
// Never let provision() silently generate a new OpenServ wallet or retry nonce.
const userApiKey = requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY);
try {
  const platform = new PlatformClient({ apiKey: userApiKey });
  await platform.agents.list(); // Read-only platform credential check.
  console.log('OpenServ user API key: accepted by read-only platform preflight.');
} catch (error) {
  console.error(explainPlatformAuthError(error));
  process.exit(1);
}

// OpenServ's default provisioning logger prints private webhook tokens. Redact
// them before any future registration or re-provisioning log reaches a terminal.
setLogger(safeProvisionLogger());

let provisioned;
try {
  provisioned = await provision({
  userApiKey,
  agent: {
    instance: agent,
    name: 'SERVJURY — Internet Court Review',
    description: 'OpenServ delivery disputes are adjudicated on GenLayer by AI validators with auditable task readback.',
  },
  workflow: {
    name: 'SERVJURY Delivery Review',
    goal: 'Adjudicate submitted agent work under fixed task acceptance criteria using GenLayer consensus.',
    trigger: triggers.webhook({
      waitForCompletion: true, timeout: 900,
      input: {
        terms: { type: 'string', description: 'Immutable task acceptance requirements' },
        delivery: { type: 'string', description: 'Exact agent output under review' },
        evidence: { type: 'string', description: 'Inspectable supporting evidence' },
      },
    }),
    task: { description: 'Use adjudicate_delivery to return a finalized GenLayer verdict to the original task log.' },
  },
  });
} catch (error) {
  console.error('OpenServ agent/workflow registration failed:', explainPlatformAuthError(error));
  process.exit(1);
}
// Agent instance binding attaches the provisioned API key and auth token.
// run(agent) is the documented OpenServ tunnel API for this SDK version.
// Do not print provisioned.apiKey, authToken, wallet keys or webhook tokens.
if (!provisioned?.agentId || !provisioned?.workflowId) {
  throw new Error('OpenServ provisioning did not return agent and workflow IDs.');
}
console.log(`SERVJURY OpenServ provisioned: agentId=${provisioned.agentId}, workflowId=${provisioned.workflowId}`);
// The platform returned a workflowId. Use its API key-authenticated trigger
// discovery via TriggersAPI; never print or save its webhook token in a text
// file. OpenServ's current apiEndpoint is /workspaces/:id/triggers/:id/fire,
// which is not the token URL expected by the older launcher. The launcher
// instead uses the workspaceId stored in the gitignored .openserv.json.
console.log('OpenServ provisioning completed; trigger token intentionally hidden.');
await run(agent);
