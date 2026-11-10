import test from 'node:test';
import assert from 'node:assert/strict';
import {caseIdForTask,publicTaskRef} from '../src/openserv-bridge.mjs';
import {buildVerifiedTaskOutput} from '../src/openserv-verified-completion.mjs';
import {classifyAuthenticatedE2E} from '../src/openserv-e2e-audit.mjs';

const ctx={workflowId:14062,taskId:750592,agentId:4954};
const task={id:ctx.taskId,assigneeAgentId:ctx.agentId,status:'done'};
const detail={id:ctx.taskId,status:'done',output:'An AI explanation was approved'};
const filed={case_id:caseIdForTask(ctx.workflowId,ctx.taskId),
  task_id:publicTaskRef(ctx.workflowId,ctx.taskId),status:'FILED',verdict:'PENDING',reason:''};
const decided={...filed,status:'DECIDED',verdict:'REWORK',reason:'Invoice subtotal mismatch'};
const receipt={caseId:filed.case_id,taskId:filed.task_id,
  verdict:'REWORK',reason:decided.reason,source:'GenLayer finalized on-chain state',
  receiptId:'servjury-1234567890abcdef',filingTxHash:'0x'+'a'.repeat(64),
  adjudicationTxHash:'0x'+'b'.repeat(64)};

test('actual observed DONE with FILED cannot be confused with completed on-chain adjudication',()=>{
  const out=classifyAuthenticatedE2E({...ctx,task,detail,onchain:filed});
  assert.equal(out.result,'DONE_WITHOUT_ONCHAIN_ADJUDICATION');
  assert.equal(out.outputPresent,true);
  assert.equal(out.onchainStatus,'FILED');
  assert.equal(out.receiptId,null);
});

test('a task in progress and FILED remains unadjudicated',()=>{
  const out=classifyAuthenticatedE2E({...ctx,
    task:{...task,status:'in-progress'},detail:{...detail,status:'in-progress',output:null},onchain:filed});
  assert.equal(out.result,'ONCHAIN_FILED_NOT_ADJUDICATED');
});

test('a DECIDED contract does not make a freely worded agent response proof',()=>{
  const out=classifyAuthenticatedE2E({...ctx,task,detail,onchain:decided});
  assert.equal(out.result,'TASK_OUTPUT_NOT_VERIFIED_RECEIPT_JSON');
});

test('a matching verified output still requires separate TX and task-log audit',()=>{
  const output=buildVerifiedTaskOutput(receipt,ctx);
  const out=classifyAuthenticatedE2E({...ctx,task,detail:{...detail,output},onchain:decided});
  assert.equal(out.result,'DONE_READBACK_REQUIRES_TX_AND_LOG_AUDIT');
  assert.equal(out.receiptId,receipt.receiptId);
});

test('wrong persisted verdict, reason, output fields and identities fail closed',()=>{
  const output=buildVerifiedTaskOutput(receipt,ctx);
  let out=classifyAuthenticatedE2E({...ctx,task,detail:{...detail,output},onchain:{...decided,reason:'different'}});
  assert.equal(out.result,'DONE_OUTPUT_DOES_NOT_MATCH_CHAIN_VERDICT');
  out=classifyAuthenticatedE2E({...ctx,task,detail:{...detail,output},onchain:{...decided,verdict:'ACCEPT'}});
  assert.equal(out.result,'DONE_OUTPUT_DOES_NOT_MATCH_CHAIN_VERDICT');
  assert.throws(()=>classifyAuthenticatedE2E({...ctx,task:{...task,assigneeAgentId:999},detail,onchain:decided}),/identity/);
  assert.throws(()=>classifyAuthenticatedE2E({...ctx,task,detail:{...detail,status:'error'},onchain:decided}),/identity/);
});

test('missing verified TXs can never satisfy a completed output',()=>{
  const output=JSON.parse(buildVerifiedTaskOutput(receipt,ctx));
  output.adjudicationTxHash=null;
  const out=classifyAuthenticatedE2E({...ctx,task,detail:{...detail,output:JSON.stringify(output)},onchain:decided});
  assert.equal(out.result,'DONE_OUTPUT_LACKS_VERIFIED_TRANSACTION_FIELDS');
});
