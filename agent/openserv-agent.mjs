// Authenticated OpenServ capability. Do not confuse its SDK task context with
// synthetic Studio fixture task IDs. No funds, escrow or automatic payouts.
import { Agent, run } from '@openserv-labs/sdk';
import { PlatformClient, provision, triggers, setLogger, getProvisionedInfo } from '@openserv-labs/client';
import { safeProvisionLogger } from '../src/openserv-safe-logging.mjs';
import { decideOpenServProvisionMode } from '../src/openserv-provision-state.mjs';
import { requireOpenServUserApiKey, explainPlatformAuthError } from '../src/openserv-auth.mjs';
import { z } from 'zod';
import { fileLiveCase, judgeLiveCase, readLiveCase } from '../src/genlayer.mjs';
import { originalWebhookEvidence } from '../src/openserv-trusted-input.mjs';
import { stableTaskIdentity, verifyLivePlatformTask } from '../src/openserv-stable-identity.mjs';
import { runTaskReview } from '../src/openserv-bridge.mjs';

if (process.env.ENABLE_LIVE_TRANSACTIONS !== '1') {
  throw new Error('Set ENABLE_LIVE_TRANSACTIONS=1 with an explicit GenLayer network and dedicated test signer.');
}

// OpenServ may invoke a capability more than once for a single task.
// Only one review and one writeback may be in-flight per task in this process.
const inFlight = new Map();
const completedInProcess = new Map();
let activeWorkflowId = 0;
let activeAgentId = 0;

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
      return JSON.stringify({ status: 'NOT_VERIFIED', reason: 'Authenticated OpenServ task context missing' });
    }
    let workflowId, taskId;
    try {
      ({ workflowId, taskId } = stableTaskIdentity(action, {
        workflowId: activeWorkflowId, agentId: activeAgentId,
      }));
    } catch {
      console.error('SERVJURY could not verify canonical OpenServ task identity.');
      return JSON.stringify({status:'NOT_VERIFIED',reason:'Stable numeric OpenServ task identity is ambiguous or unavailable'});
    }
    const taskKey = JSON.stringify([workflowId, taskId]);
    if (completedInProcess.has(taskKey)) return completedInProcess.get(taskKey);
    if (inFlight.has(taskKey)) return inFlight.get(taskKey);
    const work = (async () => {
      // A canonical task is confirmed by the authenticated platform API,
      // not by per-invocation update tokens from the agent runtime. The task
      // must be assigned to this agent and not waiting for human assistance.
      const liveTask = await new PlatformClient({ apiKey: userApiKey }).tasks.get({
        workflowId, id: taskId,
      });
      verifyLivePlatformTask(liveTask, {
        taskId, agentId: activeAgentId,
        expectedDescription: action.task.description,
      });
      // The OpenServ orchestration model added a calculated verdict to args
      // during the first live run. Ignore args as evidence authority; only
      // use the original unmodified webhook event from the authenticated task.
      const input = originalWebhookEvidence(action, taskId);
      const receipt = await runTaskReview({
        workspaceId: workflowId, taskId, input,
        allowFirstFiling: process.env.ALLOW_FIRST_FILING === '1',
        readCase: readLiveCase,
        fileCase: fileLiveCase,
        judgeCase: judgeLiveCase,
      });
      // The deterministic receipt is the partner writeback. Never output a
      // verdict unless it was read from a finalized on-chain state.
      const body = JSON.stringify(receipt);
      try {
        await this.addLogToTask({
          workspaceId: workflowId, taskId,
          severity: receipt.verdict === 'ACCEPT' ? 'info' : 'warning',
          type: 'text', body,
        });
      } catch (error) {
        const failure = JSON.stringify({
          status: 'NOT_VERIFIED', reason: 'OpenServ task log unconfirmed; do not blindly retry',
          caseId: receipt.caseId, receiptId: receipt.receiptId,
        });
        completedInProcess.set(taskKey, failure);
        console.error('SERVJURY task log not confirmed; inspect OpenServ before any repeat.');
        return failure;
      }
      completedInProcess.set(taskKey, body);
      console.log('SERVJURY authenticated OpenServ receipt written:', body);
      return body;
    })();
    inFlight.set(taskKey, work);
    try {
      return await work;
    } catch (error) {
      // The SDK logs the entire task action, including update tokens, on an
      // uncaught capability exception. Return a safe, non-verdict failure
      // instead; never pretend the chain decision has been recorded.
      console.error('SERVJURY review not finalized; no verified verdict written to task log.');
      return JSON.stringify({
        status: 'NOT_VERIFIED',
        reason: error?.txHash
          ? 'GenLayer transaction outcome uncertain; inspect chain before retry'
          : 'GenLayer read/filing/adjudication was not verified; inspect logs and chain',
      });
    } finally {
      inFlight.delete(taskKey);
    }
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

// OpenServ provision() calls workflow.sync() on every restart; this can
// mutate existing task nodes, reset their status to 'to-do', and disrupt
// human-assistance recovery. Only explicitly provision once when no saved
// agent/workflow credentials exist. Reuse .openserv.json otherwise.
const agentName = 'SERVJURY — Internet Court Review';
const workflowName = 'SERVJURY Delivery Review';
const cachedProvision = getProvisionedInfo(agentName, workflowName);
const provisionMode = decideOpenServProvisionMode(
  cachedProvision, process.env.SERVJURY_ALLOW_INITIAL_PROVISION
);
let provisioned;
if (provisionMode === 'reuse') {
  agent.setCredentials({apiKey:cachedProvision.apiKey, authToken:cachedProvision.authToken});
  provisioned = cachedProvision;
  console.log('SERVJURY OpenServ cached credentials reused; existing workflow was NOT re-synced.');
} else {
try {
  provisioned = await provision({
  userApiKey,
  agent: {
    instance: agent,
    name: agentName,
    description: 'OpenServ delivery disputes are adjudicated on GenLayer by AI validators with auditable task readback.',
  },
  workflow: {
    name: workflowName,
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
}
// Agent instance binding attaches the provisioned API key and auth token.
// run(agent) is the documented OpenServ tunnel API for this SDK version.
// Do not print provisioned.apiKey, authToken, wallet keys or webhook tokens.
if (!provisioned?.agentId || !provisioned?.workflowId) {
  throw new Error('OpenServ provisioning did not return agent and workflow IDs.');
}
activeWorkflowId = Number(provisioned.workflowId);
activeAgentId = Number(provisioned.agentId);
console.log(`SERVJURY OpenServ provisioned: agentId=${provisioned.agentId}, workflowId=${provisioned.workflowId}`);
// The platform returned a workflowId. Use its API key-authenticated trigger
// discovery via TriggersAPI; never print or save its webhook token in a text
// file. OpenServ's current apiEndpoint is /workspaces/:id/triggers/:id/fire,
// which is not the token URL expected by the older launcher. The launcher
// instead uses the workspaceId stored in the gitignored .openserv.json.
console.log('OpenServ provisioning completed; trigger token intentionally hidden.');
await run(agent);
