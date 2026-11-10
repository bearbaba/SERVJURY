// Authenticated OpenServ capability. Do not confuse its SDK task context with
// synthetic Studio fixture task IDs. No funds, escrow or automatic payouts.
import { Agent, run } from '@openserv-labs/sdk';
import { provision, triggers } from '@openserv-labs/client';
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

const provisioned = await provision({
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
// Agent instance binding attaches the provisioned API key and auth token.
// run(agent) is the documented OpenServ tunnel API for this SDK version.
// Do not print provisioned.apiKey, authToken, wallet keys or webhook tokens.
if (!provisioned?.agentId || !provisioned?.workflowId) {
  throw new Error('OpenServ provisioning did not return agent and workflow IDs.');
}
console.log(`SERVJURY OpenServ provisioned: agentId=${provisioned.agentId}, workflowId=${provisioned.workflowId}`);
await run(agent);
