// Read-only inspection of historical SERVJURY task-node IDs against the
// deployed GenLayer Studionet contract. Uses an inert *dummy* account.
// Does not trigger any OpenServ workflow, change task state or sign a TX.
// An absent numeric task case DOES NOT rule out earlier per-invocation UUID
// case IDs or transactions not yet reflected in the queried RPC state.
import { createClient,createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { caseIdForTask } from '../src/openserv-bridge.mjs';
import { auditStoredTaskState } from '../src/onchain-task-audit.mjs';
import { classifyMissingCaseWithCalibratedProbe } from '../src/genlayer-missing.mjs';

const addr=process.env.GENLAYER_CONTRACT_ADDRESS || '0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
const workflowId=Number(process.env.OPENSERV_WORKFLOW_ID || 14061);
const raw=process.env.SERVJURY_AUDIT_TASK_IDS || '750590,750591';
const taskIds=raw.split(',').map(s=>Number(s.trim()));
if(!/^0x[0-9a-fA-F]{40}$/.test(addr) || studionet.id!==61999) {
  throw Error('Wrong GenLayer contract address or Studionet chain ID');
}
if(!Number.isSafeInteger(workflowId) || workflowId<=0 ||
   taskIds.length===0 || taskIds.length>8 ||
   taskIds.some(id=>!Number.isSafeInteger(id)||id<=0) ||
   new Set(taskIds).size!==taskIds.length) {
  throw Error('Invalid workflow/task IDs for read-only audit');
}
const client=createClient({chain:studionet,account:createAccount('0x'+'11'.repeat(32))});
const read=async id=>{
  const result=await client.readContract({address:addr,functionName:'get_case',args:[id]});
  return typeof result==='string' ? JSON.parse(result):result;
};
console.log('SERVJURY_READ_ONLY_ONCHAIN_AUDIT',JSON.stringify({chainId:61999,contract:addr,workflowId,taskIds}));
let unverified=false;
for(const taskId of taskIds) {
  const caseId=caseIdForTask(workflowId,taskId);
  try {
    const state=await read(caseId);
    const summary=auditStoredTaskState(workflowId,taskId,state);
    console.log('TASK_ONCHAIN_STATE',JSON.stringify({taskId,...summary}));
  } catch(error) {
    // Only a validated missing-case signature with positive and negative
    // controls can support a NOT_FOUND readback. Transport errors fail closed.
    try {
      await classifyMissingCaseWithCalibratedProbe({
        targetError:error,
        readKnownCase:read,
        readAbsentSentinel:read,
      });
      // This classifier always throws when it finds a calibrated absence.
      unverified=true;
      console.log('TASK_ONCHAIN_UNVERIFIED',JSON.stringify({taskId,caseId}));
    } catch(calibrationError) {
      if(calibrationError?.code==='GENLAYER_UNKNOWN_CASE_PROBED') {
        console.log('TASK_NUMERIC_CASE_NOT_FOUND',JSON.stringify({taskId,caseId}));
      } else {
        unverified=true;
        console.log('TASK_ONCHAIN_UNVERIFIED',JSON.stringify({
          taskId,caseId,reason:'RPC unavailable, mismatch or inconclusive; inspect explorer before any signed retry',
        }));
      }
    }
  }
}
console.log('READ_ONLY_COMPLETE: no OpenServ task created or updated; no GenLayer transaction signed.');
console.log('LIMITATION: historic UUID-scoped attempts and pending transactions cannot be ruled out by numeric case ID reads.');
if(unverified)process.exitCode=1;
