// Read-only status inspection of the already-provisioned workflow.
// No GenLayer RPC signature, no OpenServ trigger call, no raw task payload.
import { PlatformClient } from '@openserv-labs/client';
import { requireOpenServUserApiKey } from '../src/openserv-auth.mjs';

const workflowId = Number(process.env.OPENSERV_WORKFLOW_ID || '14061');
if (!Number.isSafeInteger(workflowId) || workflowId <= 0) {
  throw Error('Invalid OPENSERV_WORKFLOW_ID');
}
const apiKey = requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY);
const client = new PlatformClient({ apiKey });
try {
  const tasks = await client.tasks.list({ workflowId });
  if (!Array.isArray(tasks)) throw Error('OpenServ task API returned an unexpected shape');
  const rows=tasks.slice(-30).map(task=>({
    taskId: String(task.id ?? ''),
    status: String(task.status ?? 'not-provided'),
    assigneeAgentId: task.assigneeAgentId ?? task.assignee ?? null,
  }));
  console.log('READ_ONLY: OpenServ workflow',workflowId,'task count:',tasks.length);
  console.log(JSON.stringify(rows,null,2));
  console.log('No task created, updated or triggered.');
} catch(error) {
  const status = Number(error?.response?.status);
  console.error(status>0 ? 'OpenServ task inspection HTTP '+status : 'OpenServ task inspection failed (details hidden).');
  process.exitCode=1;
}
