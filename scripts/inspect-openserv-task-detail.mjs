// Safe, read-only inspection of a single existing OpenServ task.
// Do not print raw detail, task logs, update tokens, or response objects.
import { PlatformClient } from '@openserv-labs/client';
import { requireOpenServUserApiKey } from '../src/openserv-auth.mjs';

const workflowId=Number(process.env.OPENSERV_WORKFLOW_ID || '14061');
const taskId=Number(process.env.OPENSERV_TASK_ID || '750590');
if (![workflowId,taskId].every(x=>Number.isSafeInteger(x) && x>0)) {
  throw Error('Positive numeric workflow ID and task ID are required');
}
const client=new PlatformClient({apiKey:requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY)});
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
