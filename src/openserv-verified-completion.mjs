// Pure guard for a NEW, fully observed GenLayer transaction pair before the
// OpenServ SDK is authorized to complete the SAME task. Never applied to the
// historical task 750591 (mixed GenVM success/error adjudication).
import {caseIdForTask,publicTaskRef} from './openserv-bridge.mjs';

const TX=/^0x[0-9a-fA-F]{64}$/;
const VERDICTS=new Set(['ACCEPT','REWORK','UNVERIFIABLE']);
export function buildVerifiedTaskOutput(receipt,{workflowId,taskId}) {
  if (!Number.isSafeInteger(workflowId)||workflowId<=0||
      !Number.isSafeInteger(taskId)||taskId<=0) throw Error('Invalid new task identity; refusing completion.');
  if(!receipt||typeof receipt!=='object'||
     receipt.caseId!==caseIdForTask(workflowId,taskId)||
     receipt.taskId!==publicTaskRef(workflowId,taskId)||
     !VERDICTS.has(receipt.verdict)||
     typeof receipt.reason!=='string'||!receipt.reason.trim()||
     !/^servjury-[0-9a-f]{16}$/.test(receipt.receiptId||'')||
     receipt.source!=='GenLayer finalized on-chain state') {
    throw Error('Invalid or mismatched GenLayer readback receipt; refusing completion.');
  }
  // Historical/persisted case readbacks are not sufficient to prove a fresh
  // clean E2E execution: both transaction hashes MUST be observed in this run,
  // by the strict GenLayer adapter that verifies GenVM, not consensus alone.
  if(!TX.test(receipt.filingTxHash||'')||!TX.test(receipt.adjudicationTxHash||'')){
    throw Error('Both freshly verified GenLayer transaction hashes required for task completion.');
  }
  return JSON.stringify({
    result:'GENLAYER_VERDICT_VERIFIED',
    workflowId,taskId,
    receiptId:receipt.receiptId,
    caseId:receipt.caseId,
    verdict:receipt.verdict,
    reason:receipt.reason,
    filingTxHash:receipt.filingTxHash,
    adjudicationTxHash:receipt.adjudicationTxHash,
    source:receipt.source,
  });
}
export function confirmCompletedTask(detail,{workflowId,taskId,output}) {
  if(Number(detail?.id)!==taskId || String(detail?.status)!=='done' ||
    typeof detail?.output!=='string'||detail.output!==output) {
    throw Error('OpenServ task completion readback not confirmed; never retry blindly.');
  }
  const parsed=JSON.parse(output);
  if(parsed.workflowId!==workflowId||parsed.taskId!==taskId) {
    throw Error('Completed task identity does not match original execution.');
  }
  return true;
}
