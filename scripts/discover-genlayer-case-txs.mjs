// Read-only attempt to correlate the finalized SERVJURY case with the
// transaction history of its contract. This is not an authenticated task call.
// Hosted Studionet may not implement sim_getTransactionsForAddress; if absent,
// report clearly and do not infer a nonexistent adjudication.
import {createClient, createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {provenGenVMExecutionName} from '../src/genlayer-tx-status.mjs';
import {caseIdForTask} from '../src/openserv-bridge.mjs';

const address=process.env.GENLAYER_CONTRACT_ADDRESS || '0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
const workflowId=process.env.OPENSERV_WORKFLOW_ID ? Number(process.env.OPENSERV_WORKFLOW_ID) : null;
const taskId=process.env.OPENSERV_TASK_ID ? Number(process.env.OPENSERV_TASK_ID) : null;
if((workflowId!==null || taskId!==null) &&
   (!Number.isSafeInteger(workflowId)||workflowId<=0||
    !Number.isSafeInteger(taskId)||taskId<=0)) {
  throw Error('Both valid OPENSERV_WORKFLOW_ID and OPENSERV_TASK_ID are required for a scoped read-only case-history audit');
}
const caseId=workflowId!==null && taskId!==null
  ? caseIdForTask(workflowId,taskId)
  : 'sj_745eae3d3d0921304a80ec55';
if(!/^0x[0-9a-fA-F]{40}$/.test(address)||studionet.id!==61999) throw Error('Incorrect Studionet contract');
const client=createClient({chain:studionet,account:createAccount('0x'+'11'.repeat(32))});
let result;
try {
  result=await client.request({method:'sim_getTransactionsForAddress',params:[address]});
} catch(error) {
  const code=Number(error?.code ?? error?.cause?.code ?? 0);
  console.log('GENLAYER_ADDRESS_HISTORY_UNAVAILABLE',JSON.stringify({rpcCode:Number.isFinite(code)&&code!==0 ? code:null}));
  console.log('No signed transaction attempted. Use the official Explorer transaction history for the contract instead.');
  process.exit(0);
}
const list=Array.isArray(result)?result:Array.isArray(result?.transactions)?result.transactions:Array.isArray(result?.items)?result.items:null;
if(!list){console.log('GENLAYER_ADDRESS_HISTORY_UNKNOWN_SHAPE');process.exit(0);}
console.log('GENLAYER_ADDRESS_HISTORY_READ',JSON.stringify({count:list.length,inspectedAtMost:80,caseId,workflowId,taskId}));
const selected=list.slice(-80);
let matches=0;
for(const summary of selected){
  const hash=String(summary?.hash||summary?.tx_id||summary?.txId||summary?.transaction_hash||'');
  if(!/^0x[0-9a-fA-F]{64}$/.test(hash)) continue;
  let tx;
  try { tx=await client.getTransaction({hash}); } catch {continue;}
  const calldata=tx?.data?.calldata;
  const source=typeof calldata==='string'?calldata:
    calldata && typeof calldata==='object'?JSON.stringify(calldata):'';
  const caseMatch=source.includes(caseId);
  // Studio calldata may be SDK v1's plain text representation instead of
  // an object with function_name. Method hints are never used as proof on
  // their own; the exact case ID must also match.
  const readable=typeof calldata==='object' && calldata && typeof calldata.readable==='string'
    ? calldata.readable : source;
  const method=typeof calldata==='object' && calldata
    ? String(calldata.function_name||calldata.functionName||calldata.method||'')
    : source.includes('adjudicate_case') ? 'adjudicate_case'
    : source.includes('file_case') ? 'file_case' : '';
  const executionValues=Array.isArray(tx?.consensus_data?.leader_receipt)
    ? tx.consensus_data.leader_receipt.map(x=>String(x?.execution_result||'UNKNOWN').toUpperCase()).slice(0,8)
    : [];
  if(!caseMatch)continue; // never conflate unrelated case adjudications with the target
  matches++;
  console.log('GENLAYER_CASE_TRANSACTION',JSON.stringify({
    hash,caseMatched:caseMatch,
    methodHint:caseMatch && /^[A-Za-z_]{1,60}$/.test(method)?method:null,
    methodMarkers:{fileCase:readable.includes('file_case'),adjudicateCase:readable.includes('adjudicate_case')},
    executionReceiptCount:executionValues.length,
    executionReceipts:executionValues.map(x=>['SUCCESS','ERROR','UNKNOWN'].includes(x)?x:'OTHER'),
    resultName:/^[A-Za-z_]{1,64}$/.test(String(tx?.result_name||''))?tx.result_name:null,
    status:String(tx?.statusName||'UNKNOWN'),
    execution:provenGenVMExecutionName(tx)||'UNCONFIRMED',
  }));
}
if(matches===0)console.log('NO_CASE_TRANSACTION_MATCH_IN_INSPECTED_HISTORY; not proof adjudication did not happen.');
console.log('READ_ONLY: no GenLayer transaction signed or OpenServ task modified.');
