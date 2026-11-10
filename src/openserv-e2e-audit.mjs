// Read-only, evidence-driven E2E classifier. A platform "done" or output
// reviewer approval is never sufficient to claim that the Intelligent Contract
// actually produced a verdict.
import {caseIdForTask,publicTaskRef} from './openserv-bridge.mjs';
import {auditStoredTaskState} from './onchain-task-audit.mjs';
import {buildVerifiedTaskOutput} from './openserv-verified-completion.mjs';

export function classifyAuthenticatedE2E({workflowId,taskId,agentId,task,detail,onchain}) {
  if(!Number.isSafeInteger(workflowId)||workflowId<=0||
     !Number.isSafeInteger(taskId)||taskId<=0||
     !Number.isSafeInteger(agentId)||agentId<=0||
     Number(task?.id)!==taskId||Number(detail?.id)!==taskId||
     Number(task?.assigneeAgentId)!==agentId||
     String(task?.status)!==String(detail?.status)){
    throw Error('OpenServ task identity or status readbacks differ; E2E unverified.');
  }
  const state=auditStoredTaskState(workflowId,taskId,onchain);
  const status=String(detail.status);
  const out=typeof detail.output==='string'?detail.output.trim():'';
  const base={
    workflowId,taskId,agentId,caseId:caseIdForTask(workflowId,taskId),
    publicTaskRef:publicTaskRef(workflowId,taskId),taskStatus:status,
    outputPresent:out.length>0,onchainStatus:state.status,
    onchainVerdict:state.verdict||null,receiptId:null,
  };
  if(state.status==='FILED'){
    return {...base,result: status==='done'?'DONE_WITHOUT_ONCHAIN_ADJUDICATION':'ONCHAIN_FILED_NOT_ADJUDICATED'};
  }
  if(status!=='done'||!out)return {...base,result:'VERDICT_EXISTS_BUT_TASK_NOT_DONE'};
  let output;
  try{output=JSON.parse(out);}
  catch{return {...base,result:'TASK_OUTPUT_NOT_VERIFIED_RECEIPT_JSON'};}
  if(!output||typeof output!=='object'||Array.isArray(output)||
     output.result!=='GENLAYER_VERDICT_VERIFIED'||
     output.verdict!==state.verdict||
     typeof output.reason!=='string'||!output.reason.trim()||
     output.caseId!==base.caseId||
     output.taskId!==taskId||output.workflowId!==workflowId) {
    return {...base,result:'DONE_OUTPUT_DOES_NOT_MATCH_CHAIN_VERDICT'};
  }
  let expected;
  try{
    expected=buildVerifiedTaskOutput({
      caseId:output.caseId,taskId:base.publicTaskRef,
      verdict:output.verdict,reason:output.reason,receiptId:output.receiptId,
      filingTxHash:output.filingTxHash,adjudicationTxHash:output.adjudicationTxHash,
      source:output.source,
    },{workflowId,taskId});
  }catch{return {...base,result:'DONE_OUTPUT_LACKS_VERIFIED_TRANSACTION_FIELDS'};}
  if(expected!==out)return {...base,result:'DONE_OUTPUT_NOT_CANONICAL'};
  return {...base,result:'DONE_READBACK_REQUIRES_TX_AND_LOG_AUDIT',receiptId:output.receiptId,
    filingTxHash:output.filingTxHash,adjudicationTxHash:output.adjudicationTxHash};
}
