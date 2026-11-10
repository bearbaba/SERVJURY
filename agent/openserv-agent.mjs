// Actual OpenServ partner capability: it runs in an authenticated OpenServ task,
// files the fixed evidence with GenLayer, independently adjudicates, and logs
// the final verdict back to the original OpenServ task.
// This entry point is NOT executed in offline demo mode.
import { createHash } from 'node:crypto';
import { Agent, run } from '@openserv-labs/sdk';
import { provision, triggers } from '@openserv-labs/client';
import { z } from 'zod';
import { fileLiveCase, judgeLiveCase, readLiveCase } from '../src/genlayer.mjs';
import { validateCase } from '../src/engine.mjs';

if (process.env.ENABLE_LIVE_TRANSACTIONS !== '1') {
  throw new Error('Set ENABLE_LIVE_TRANSACTIONS=1 and configure a funded GenLayer signer before running the OpenServ agent.');
}
const agent = new Agent({
  systemPrompt: 'You are SERVJURY, a neutral delivery-review relay. Never invent a GenLayer verdict. Only use the recorded chain result.',
});
agent.addCapability({
  name: 'adjudicate_delivery',
  description: 'File an OpenServ task delivery case to Internet Court via GenLayer and record the AI-validator jury verdict back to the task log.',
  inputSchema: z.object({
    terms: z.string().min(1).max(2000),
    delivery: z.string().min(1).max(4000),
    evidence: z.string().min(1).max(4000),
  }),
  async run({ args, action }) {
    if (action?.type !== 'do-task' || !action.task || !action.workspace) {
      throw new Error('OpenServ task and workspace context required. No unauthenticated manual case filing.');
    }
    const workspaceId = action.workspace.id;
    const taskId = action.task.id;
    const opaqueId = createHash('sha256').update(`${workspaceId}/${taskId}`).digest('hex').slice(0, 24);
    const caseId = `sj_${opaqueId}`;
    const input = validateCase({ ...args, taskId: String(taskId) });
    let state;
    try { state = await readLiveCase(caseId); }
    catch (e) {
      // Only create on explicitly missing case; network failures must not
      // cause blind repeat submissions. We deliberately fail closed here.
      if (process.env.ALLOW_FIRST_FILING !== '1') {
        throw new Error(`Read failed or case missing. Set ALLOW_FIRST_FILING=1 only after checking on-chain ID ${caseId}. Original: ${String(e)}`);
      }
      const filing = await fileLiveCase(caseId, input);
      state = await readLiveCase(caseId);
      if (state.task_id !== String(taskId)) throw new Error(`Case/task mismatch after filing ${filing.txHash}`);
    }
    if (state.status === 'FILED') {
      await judgeLiveCase(caseId);
      state = await readLiveCase(caseId);
    }
    if (state.status !== 'DECIDED') throw new Error('GenLayer has not finalized a decision; no OpenServ status update is allowed');
    const result = { taskId: String(taskId), caseId, verdict: state.verdict, reason: state.reason, source: 'GenLayer finalized on-chain state' };
    await this.addLogToTask({
      workspaceId, taskId, severity: state.verdict === 'ACCEPT' ? 'info' : 'warning',
      type: 'text', body: JSON.stringify(result),
    });
    // SDK task completion is managed by OpenServ; do not call completeTask().
    // No escrow, token transfer or refund is claimed or triggered.
    return JSON.stringify(result);
  },
});
await provision({
  agent: { instance: agent, name: 'SERVJURY — Internet Court Review', description: 'An OpenServ task capability that sends delivery disputes to GenLayer for independent AI-validator adjudication.' },
  workflow: {
    name: 'SERVJURY Delivery Review',
    goal: 'Review submitted evidence against immutable OpenServ task acceptance terms via GenLayer and return the finalized independent verdict to the task record.',
    trigger: triggers.webhook({ waitForCompletion: true, timeout: 900 }),
    task: { description: 'Assess a delivery dispute by checking the original terms, submitted output and supporting evidence in GenLayer.' },
  },
});
await run(agent);
