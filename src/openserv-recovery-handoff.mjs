// Read-only verified state -> explicitly scoped OpenServ recovery log.
// Never claim mixed GenVM execution receipts prove successful adjudication.
// Never change the verdict or trust a human-suggested calculation.
import {auditStoredTaskState} from './onchain-task-audit.mjs';
import {verifiedReceipt,caseIdForTask,publicTaskRef} from './openserv-bridge.mjs';

const FILING='0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376';
const ADJUDICATION='0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406';

export function validateRecoveryTask(task,{workflowId,taskId,agentId}) {
  if(workflowId!==14061 || taskId!==750591 || agentId!==4953 ||
     Number(task?.id)!==taskId || Number(task?.assigneeAgentId)!==agentId) {
    throw Error('Recovery is not authorized for this workflow/task/agent identity.');
  }
  if(String(task?.status||'').toLowerCase()!=='human-assistance-required') {
    throw Error('Original task is not awaiting Human Assistance; no recovery log will be attempted.');
  }
  if(typeof task?.output==='string' && task.output.trim()) {
    throw Error('Original task already has output; inspect logs before a recovery attempt.');
  }
  if(typeof task?.description!=='string' ||
     task.description!=='Use adjudicate_delivery to return a finalized GenLayer verdict to the original task log.') {
    throw Error('OpenServ task description does not match the original reviewed workflow.');
  }
}

export function buildReadbackHandoff(state,filing,adjudication,{workflowId=14061,taskId=750591}={}) {
  if(workflowId!==14061 || taskId!==750591) throw Error('Unrecognized existing task');
  const summary=auditStoredTaskState(workflowId,taskId,state);
  if(summary.result!=='DECIDED_READBACK') throw Error('No persisted GenLayer verdict to hand back to OpenServ');
  const caseId=caseIdForTask(workflowId,taskId);
  const taskRef=publicTaskRef(workflowId,taskId);
  if(filing?.hash!==FILING || filing?.status!=='FINALIZED' ||
     filing?.execution!=='FINISHED_WITH_RETURN' || filing?.recipientMatch!==true) {
    throw Error('Existing file_case transaction does not have proven execution success');
  }
  if(adjudication?.hash!==ADJUDICATION || adjudication?.status!=='FINALIZED' ||
     adjudication?.recipientMatch!==true || adjudication?.caseMatched!==true ||
     adjudication?.methodMarked!==true ||
     !Array.isArray(adjudication?.executionReceipts) ||
     JSON.stringify(adjudication.executionReceipts)!=='["SUCCESS","ERROR"]') {
    throw Error('Existing adjudicate_case transaction evidence does not match the audited record');
  }
  const receipt=verifiedReceipt(state,{
    caseId,taskId:taskRef,
    filingTxHash:FILING,
    // Do not present conflicting GenVM receipts as a proven SUCCESS TX.
    adjudicationTxHash:ADJUDICATION,
  });
  return {
    ...receipt,
    workflowId,openServTaskNodeId:taskId,
    status:'ONCHAIN_READBACK_VERIFIED',
    adjudicationConsensusStatus:'FINALIZED',
    adjudicationExecution:'MIXED_SUCCESS_ERROR_NOT_UNANIMOUSLY_CONFIRMED',
    onchainCaseStatus:'DECIDED',
    openServTaskStatus:'HUMAN_ASSISTANCE_REQUIRED_AT_PREFLIGHT',
    handoffType:'existing-task-log-only',
    note:'This reports an existing on-chain DECIDED verdict. It does not create or retry GenLayer transactions, mark the OpenServ task done, or claim unanimous adjudication execution.',
  };
}
