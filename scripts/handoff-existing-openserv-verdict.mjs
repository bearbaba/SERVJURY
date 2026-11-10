// Operator-controlled recovery of an EXISTING GenLayer verdict to the SAME
// OpenServ task node. Dry run by default. No signer, no task trigger, no
// adjudication, no task status update, no private token ever printed.
// The original human-assistance question still requires operator attention.
import {createClient,createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {PlatformClient,getProvisionedInfo} from '@openserv-labs/client';
import {requireOpenServUserApiKey} from '../src/openserv-auth.mjs';
import {summarizeStoredGenLayerTx} from '../src/genlayer-tx-status.mjs';
import {caseIdForTask} from '../src/openserv-bridge.mjs';
import {validateRecoveryTask,buildReadbackHandoff} from '../src/openserv-recovery-handoff.mjs';
import {open} from 'node:fs/promises';

const workflowId=14061, taskId=750591, agentId=4953;
const contract='0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
const fileHash='0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376';
const adjudicateHash='0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406';
const execute=process.argv.includes('--write-log');
const userKey=requireOpenServUserApiKey(process.env.OPENSERV_USER_API_KEY);
const platform=new PlatformClient({apiKey:userKey});
const cached=getProvisionedInfo('SERVJURY — Internet Court Review','SERVJURY Delivery Review');
if(Number(cached?.agentId)!==agentId || Number(cached?.workflowId)!==workflowId ||
   typeof cached.apiKey!=='string' || !cached.apiKey) {
  throw Error('Cached agent identity missing or changed; refusing recovery.');
}
const task=await platform.tasks.get({workflowId,id:taskId});
validateRecoveryTask(task,{workflowId,taskId,agentId});
// Public task output is NOT a server log. Nevertheless, a completed output
// means manual review is required before any recovery attempt. Fail closed if
// the authenticated task-detail endpoint becomes unavailable.
const detail=await platform.get('/workspaces/'+workflowId+'/tasks/'+taskId+'/detail');
if(Number(detail?.id)!==taskId || String(detail?.status||'')!=='human-assistance-required'){
  throw Error('OpenServ detail differs from authenticated task status; refusing handoff.');
}
if(typeof detail.output==='string' && detail.output.trim()){
  throw Error('OpenServ task already has output; inspect it instead of writing another log.');
}
const publicClient=createClient({
  chain:studionet,
  account:createAccount('0x'+'11'.repeat(32)),
});
if(studionet.id!==61999)throw Error('Wrong GenLayer chain');
const caseId=caseIdForTask(workflowId,taskId);
const stateRaw=await publicClient.readContract({address:contract,functionName:'get_case',args:[caseId]});
const state=typeof stateRaw==='string' ? JSON.parse(stateRaw) : stateRaw;
const filed=await publicClient.getTransaction({hash:fileHash});
const judged=await publicClient.getTransaction({hash:adjudicateHash});
const filingSummary=summarizeStoredGenLayerTx(filed,contract);
const adjudicationSummary=summarizeStoredGenLayerTx(judged,contract);
const calldata=judged?.data?.calldata;
const callText=typeof calldata==='string' ? calldata :
  calldata && typeof calldata==='object' ? JSON.stringify(calldata) : '';
const executionReceipts=Array.isArray(judged?.consensus_data?.leader_receipt)
  ? judged.consensus_data.leader_receipt.map(x=>String(x?.execution_result||'UNKNOWN').toUpperCase())
  : [];
const payload=buildReadbackHandoff(state,{
  hash:fileHash,
  status:filingSummary.status,
  execution:filingSummary.execution,
  recipientMatch:filingSummary.recipientMatch,
},{
  hash:adjudicateHash,
  status:adjudicationSummary.status,
  recipientMatch:adjudicationSummary.recipientMatch,
  caseMatched:callText.includes(caseId),
  methodMarked:callText.includes('adjudicate_case'),
  executionReceipts,
},{workflowId,taskId});
console.log('EXISTING_TASK_HANDOFF_PREFLIGHT',JSON.stringify({
  workflowId,taskId,agentId,caseId,
  taskStatus:task.status,onchainStatus:state.status,verdict:payload.verdict,
  receiptId:payload.receiptId,
  filingExecution:filingSummary.execution,
  adjudicationExecution:payload.adjudicationExecution,
  target:'existing OpenServ task log ONLY',
}));
if(!execute){
  console.log('DRY_RUN_ONLY: No OpenServ log written, task status changed, case filed, or adjudication signed.');
  console.log('Human Assistance must be reviewed in OpenServ Run Mode before attempting an explicit log-only handoff.');
  console.log('If task has no existing verdict log and the operator authorizes one log-only write, run SERVJURY_CONFIRM_HANDOFF=ONE_LOG_ONLY npm run task:handoff -- --write-log.');
} else {
  if(process.env.SERVJURY_CONFIRM_HANDOFF!=='ONE_LOG_ONLY'){
    throw Error('Explicit SERVJURY_CONFIRM_HANDOFF=ONE_LOG_ONLY required for one authenticated task log write.');
  }
  // Create local attempt marker BEFORE the request. A timeout may represent
  // a successful server write: no automatic retries, ever.
  const marker='.servjury-handoff-attempt-'+taskId+'.lock';
  let file;
  try {file=await open(marker,'wx',0o600);} catch {
    throw Error('Prior handoff attempt marker exists or cannot be created; inspect OpenServ logs and do not retry blindly.');
  }
  try {await file.writeFile(JSON.stringify({taskId,workflowId,caseId,receiptId:payload.receiptId,intent:'ONE_LOG_ONLY'})+'\n');}
  finally {await file.close();}
  const writer=new PlatformClient({apiKey:cached.apiKey});
  try {
    await writer.post('/workspaces/'+workflowId+'/tasks/'+taskId+'/log',{
      severity:'warning',type:'text',body:JSON.stringify(payload),
    });
    console.log('OPEN_SERV_LOG_WRITE_ACKNOWLEDGED',JSON.stringify({workflowId,taskId,receiptId:payload.receiptId}));
    console.log('This does NOT mark task done; inspect the same task log and Human Assistance in OpenServ Run Mode.');
  } catch(error){
    const status=Number(error?.response?.status);
    console.error('OPEN_SERV_LOG_WRITE_UNCONFIRMED',JSON.stringify({
      workflowId,taskId,
      httpStatus:Number.isFinite(status)&&status>0?status:null,
    }));
    console.error('An at-most-once attempt marker exists. Do not retry until server-side task log has been manually inspected.');
    process.exitCode=1;
  }
}
