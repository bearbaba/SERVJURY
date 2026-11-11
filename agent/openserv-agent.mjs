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
import { SERVJURY_TASK_DESCRIPTION, SERVJURY_TASK_BODY, SERVJURY_TASK_INPUT, SERVJURY_TASK_BODY_V2, SERVJURY_TASK_INPUT_V2, SERVJURY_TASK_BODY_V3, SERVJURY_TASK_INPUT_V3 } from '../src/openserv-task-instructions.mjs';
import { selectOpenServProfile, requireActiveProfile, allowsVerifiedTaskCompletion } from '../src/openserv-profiles.mjs';
import { buildVerifiedTaskOutput, confirmCompletedTask } from '../src/openserv-verified-completion.mjs';

const profile=requireActiveProfile(selectOpenServProfile());

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
  systemPrompt: 'You are SERVJURY, a neutral delivery-review relay. Never invent or revise an on-chain verdict. Only report finalized chain state. If adjudicate_delivery returns NOT_VERIFIED or TASK_COMPLETION_UNCONFIRMED, do not assert successful completion or call output-completion tools. Never retry a signed operation. A reviewer score is not proof of a GenLayer verdict.',
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
      // E2E completion is opt-in and requires fresh, strictly verified GenLayer
      // filing AND adjudication hashes. In particular, a read-only recovery of
      // old task 750591 cannot satisfy this condition.
      const verifiedOutput=allowsVerifiedTaskCompletion(profile)
        ? buildVerifiedTaskOutput(receipt,{workflowId,taskId})
        : null;
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
      if(verifiedOutput) {
        // An authenticated SDK action completes exactly the task it just
        // reviewed. An ACK without an explicit task readback is not completion.
        // Network errors here are UNCERTAIN side effects; never retry.
        try {
          await this.completeTask({workspaceId:workflowId,taskId,output:verifiedOutput});
          const detail=await this.getTaskDetail({workspaceId:workflowId,taskId});
          confirmCompletedTask(detail,{workflowId,taskId,output:verifiedOutput});
        } catch {
          const failure=JSON.stringify({
            status:'TASK_COMPLETION_UNCONFIRMED',
            taskId,caseId:receipt.caseId,receiptId:receipt.receiptId,
            reason:'Completion may have been accepted; inspect original OpenServ Task Output before any action.',
          });
          completedInProcess.set(taskKey,failure);
          console.error('SERVJURY OpenServ completion not confirmed. Do NOT replay or re-sign.');
          return failure;
        }
        completedInProcess.set(taskKey,verifiedOutput);
        console.log('SERVJURY independently confirmed original OpenServ task status DONE.');
        return verifiedOutput;
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
// The separate E2E profile provisions a NEW agent/workflow only when explicitly
// requested. Default legacy profile reuses cached credentials and NEVER syncs.
const agentName = profile.agentName;
const workflowName = profile.workflowName;
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
    // These fields matter for NEW explicitly provisioned workflows only.
    // Cached existing workflow #14061 is deliberately not re-synced.
    // The platform may separately fail when restoring Human Assistance
    // message history; this body does not claim to fix that provider error.
    tasks: [{
      name:'delivery-evidence-review',
      description:SERVJURY_TASK_DESCRIPTION,
      body:profile.id==='e2e-v3'?SERVJURY_TASK_BODY_V3:profile.id==='e2e-v2'?SERVJURY_TASK_BODY_V2:SERVJURY_TASK_BODY,
      input:profile.id==='e2e-v3'?SERVJURY_TASK_INPUT_V3:profile.id==='e2e-v2'?SERVJURY_TASK_INPUT_V2:SERVJURY_TASK_INPUT,
    }],
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
if(profile.id==='e2e-v3') {
  if(['1','true'].includes(String(process.env.DISABLE_TUNNEL||'').toLowerCase())) {
    throw Error('V3 requires SDK tunnel mode in Codespaces; DISABLE_TUNNEL must not be enabled.');
  }
  if([14061,14062,14063].includes(activeWorkflowId) ||
     [4953,4954,4955].includes(activeAgentId)) {
    throw Error('V3 resolved to a historical agent/workflow identity. Refusing Agent start.');
  }
}
await run(agent);
if(profile.id==='e2e-v3') {
  // SDK run() starts the local server and initiates its tunnel. This marker
  // enables local process+health checks, not proof of remote proxy reachability.
  const {writeFile}=await import('node:fs/promises');
  const {V3_READY_FILE}=await import('../src/openserv-agent-readiness.mjs');
  const port=Number(agent.port);
  if(!Number.isSafeInteger(port)||port<1||port>65535) {
    throw Error('SDK did not expose a known local agent port. Do not trigger V3.');
  }
  const ready={profile:'e2e-v3',workflowId:activeWorkflowId,agentId:activeAgentId,
    pid:process.pid,port,transport:'sdk-tunnel',startedAt:new Date().toISOString()};
  await writeFile(V3_READY_FILE,JSON.stringify(ready)+'\n',{mode:0o600});
  console.log('SERVJURY_V3_LOCAL_READY',JSON.stringify({
    workflowId:activeWorkflowId,agentId:activeAgentId,localPort:port,
    note:'Local readiness is not proof of a connected remote tunnel',
  }));
  console.log('Keep Terminal A running. Confirm the SDK reports Tunnel connected before any V3 trigger.');
}
