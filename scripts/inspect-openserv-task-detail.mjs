// Safe, read-only inspection of a single existing OpenServ task.
// Do not print raw detail, task logs, update tokens, or response objects.
import { PlatformClient } from '@openserv-labs/client';
import { requireOpenServUserApiKey } from '../src/openserv-auth.mjs';

const workflowId=Number(process.env.OPENSERV_WORKFLOW_ID || '14061');
if (!Number.isSafeInteger(workflowId) || workflowId<=0) {
  throw Error('Positive numeric workflow ID is required');
}
const client=new PlatformClient({apiKey:requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY)});
let taskId=Number(process.env.OPENSERV_TASK_ID || 0);
if (!process.env.OPENSERV_TASK_ID) {
  // Do not hardcode an old task ID. List current workflow task definitions;
  // only auto-select if exactly one is available. A task definition is not
  // evidence that a webhook execution has completed.
  let tasks;
  try {
    tasks=await client.tasks.list({workflowId});
  } catch(error) {
    console.error('Unable to resolve current workflow task:', Number(error?.response?.status)>0 ? 'HTTP '+error.response.status : 'details withheld');
    process.exit(1);
  }
  if (!Array.isArray(tasks) || tasks.length!==1) {
    console.error('Current workflow has no single unambiguous task. Set OPENSERV_TASK_ID to an observed numeric task ID.');
    process.exit(1);
  }
  taskId=Number(tasks[0]?.id);
  console.log('READ_ONLY: auto-selected unique current workflow task',taskId,'(not a run/session ID)');
}
if (!Number.isSafeInteger(taskId) || taskId<=0) {
  throw Error('Positive numeric task ID is required');
}
const shortError=(prefix,error)=>{
  const code=Number(error?.response?.status);
  console.error(prefix,code>0 ? 'HTTP '+code : 'details withheld');
};
try {
  const task=await client.tasks.get({workflowId,id:taskId});
  console.log('EXISTING_TASK_READ_ONLY',JSON.stringify({
    workflowId,taskId,
    status:String(task.status || 'unknown'),
    assigneeAgentId:task.assigneeAgentId ?? null,
  }));
} catch(error) {
  shortError('Could not get OpenServ task:',error);process.exitCode=1;
}
try {
  // The official OpenServ agent SDK uses this documented GET path in getTaskDetail().
  const detail=await client.get(`/workspaces/${workflowId}/tasks/${taskId}/detail`);
  console.log('EXISTING_TASK_DETAIL_READ_ONLY',JSON.stringify({
    taskId,
    status:String(detail?.status || 'unknown'),
    outputPresent: Boolean(detail?.output && String(detail.output).trim()),
    expectedOutputPresent: Boolean(detail?.expectedOutput && String(detail.expectedOutput).trim()),
    attachmentsCount: Array.isArray(detail?.attachments) ? detail.attachments.length : null,
  }));
} catch(error) {
  shortError('OpenServ detail not accessible via platform key:',error);
  console.log('Review the Human Assistance request in the OpenServ dashboard. No status was changed.');
}
console.log('No task created, no human assistance answered, no transaction signed.');
