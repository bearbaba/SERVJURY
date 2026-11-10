// Authenticated READ-ONLY configuration validation before explicitly
// initiating a fresh isolated E2E task. No signatures or task changes.
import {getProvisionedInfo,PlatformClient} from '@openserv-labs/client';
import {selectOpenServProfile,requireActiveProfile} from '../src/openserv-profiles.mjs';
import {requireOpenServUserApiKey} from '../src/openserv-auth.mjs';
const profile=requireActiveProfile(selectOpenServProfile());
if(profile.id!=='e2e-v2')throw Error('Preflight requires SERVJURY_AGENT_PROFILE=e2e-v2; previous workflows 14061/14062 must remain frozen.');
if(process.env.SERVJURY_COMPLETE_VERIFIED_TASK!=='1')throw Error('E2E completion mode is not explicitly enabled in preflight; do not trigger an incomplete demo.');
const cached=getProvisionedInfo(profile.agentName,profile.workflowName);
const workflowId=Number(cached?.workflowId),agentId=Number(cached?.agentId);
if(!Number.isSafeInteger(workflowId)||workflowId<=0||
   !Number.isSafeInteger(agentId)||agentId<=0||
   [14061,14062].includes(workflowId)||[4953,4954].includes(agentId))throw Error('Isolated E2E workflow and agent not provisioned or conflict with legacy environment.');
const client=new PlatformClient({apiKey:requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY)});
const tasks=await client.tasks.list({workflowId});
if(!Array.isArray(tasks)||tasks.length!==1)throw Error('Expected exactly one isolated E2E task node; no webhook will be triggered.');
const task=tasks[0];
if([750591,750592].includes(Number(task.id))||Number(task.assigneeAgentId)!==agentId) {
  throw Error('E2E task identity mismatch; no webhook will be triggered.');
}
const detail=await client.get('/workspaces/'+workflowId+'/tasks/'+task.id+'/detail');
const input=(typeof detail?.input==='string'?detail.input:'').trim();
const body=(typeof detail?.body==='string'?detail.body:'').trim();
const description=(typeof detail?.description==='string'?detail.description:'').trim();
const status=String(detail?.status||'');
console.log('E2E_READ_ONLY_PREFLIGHT',JSON.stringify({
  workflowId,agentId,taskId:task.id,status,
  bodyPresent:body.length>0,
  inputPresent:input.length>0,
  descriptionPresent:description.length>0,
  completionOptIn:process.env.SERVJURY_COMPLETE_VERIFIED_TASK==='1'
}));
if(Number(detail?.id)!==Number(task.id)||!body||!input||!description||
   !['to-do','in-progress'].includes(status)){
  throw Error('Isolated E2E task prompt or status not ready; do not run webhook. Inspect the existing task instead.');
}
console.log('E2E_PREFLIGHT_OK: no tasks or GenLayer writes created. Run new task only after deliberate operator authorization.');
