// Safe account-authenticated, read-only cross-check of EXISTING OpenServ task
// and original GenLayer on-chain case. Does not download or print raw Task
// Output, task log, credentials, private webhook payloads or signing keys.
import {PlatformClient} from '@openserv-labs/client';
import {createClient,createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {requireOpenServUserApiKey} from '../src/openserv-auth.mjs';
import {caseIdForTask} from '../src/openserv-bridge.mjs';
import {classifyAuthenticatedE2E} from '../src/openserv-e2e-audit.mjs';

const workflowId=Number(process.env.OPENSERV_WORKFLOW_ID);
const taskId=Number(process.env.OPENSERV_TASK_ID);
const agentId=Number(process.env.OPENSERV_AGENT_ID);
const addr=process.env.GENLAYER_CONTRACT_ADDRESS || '0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
if(!Number.isSafeInteger(workflowId)||workflowId<=0||
   !Number.isSafeInteger(taskId)||taskId<=0||
   !Number.isSafeInteger(agentId)||agentId<=0||
   !/^0x[0-9a-fA-F]{40}$/.test(addr)||studionet.id!==61999) {
  throw Error('Require OPENSERV_WORKFLOW_ID, OPENSERV_TASK_ID, OPENSERV_AGENT_ID and correct Studionet contract.');
}
console.log('E2E_AUDIT_SCOPE',JSON.stringify({workflowId,taskId,agentId,chainId:61999,contract:addr,
  intent:'READ_ONLY_NO_TRANSACTIONS'}));
const platform=new PlatformClient({apiKey:requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY)});
let task,detail;
try {
  task=await platform.tasks.get({workflowId,id:taskId});
  detail=await platform.get('/workspaces/'+workflowId+'/tasks/'+taskId+'/detail');
} catch(error) {
  console.error('OPENSERV_TASK_READ_UNVERIFIED',JSON.stringify({
    statusCode:Number(error?.response?.status)||null,
    message:'No raw server body printed for credential safety.',
  }));
  process.exit(1);
}
let state;
try {
  const client=createClient({chain:studionet,account:createAccount('0x'+'11'.repeat(32))});
  state=await client.readContract({address:addr,functionName:'get_case',args:[caseIdForTask(workflowId,taskId)]});
  if(typeof state==='string')state=JSON.parse(state);
}catch(error){
  console.error('GENLAYER_READ_UNVERIFIED',JSON.stringify({caseId:caseIdForTask(workflowId,taskId),
    message:'RPC unavailable, case missing, or returned an unparseable response. Do not retry signed operations.'}));
  process.exit(1);
}
let result;
try {
 result=classifyAuthenticatedE2E({workflowId,taskId,agentId,task,detail,onchain:state});
}catch{
 console.error('E2E_IDENTITY_OR_STATE_UNVERIFIED: refuse to infer completion.');
 process.exit(1);
}
console.log('E2E_READ_ONLY_RESULT',JSON.stringify(result));
console.log('NOTES: A DONE task with a FILED case is NOT a verified E2E adjudication. A matching DONE output still requires separate verification of BOTH GenVM TX receipts and original OpenServ task-log receipt.');
console.log('READ_ONLY_COMPLETE: zero signed GenLayer operations; zero OpenServ task mutations.');
if(result.result!=='DONE_READBACK_REQUIRES_TX_AND_LOG_AUDIT')process.exitCode=2;
