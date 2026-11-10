import test from 'node:test';
import assert from 'node:assert/strict';
import {caseIdForTask,publicTaskRef} from '../src/openserv-bridge.mjs';
import {buildVerifiedTaskOutput,confirmCompletedTask} from '../src/openserv-verified-completion.mjs';
import {selectOpenServProfile,allowsVerifiedTaskCompletion} from '../src/openserv-profiles.mjs';
const ctx={workflowId:28801,taskId:88801};
const receipt={
  caseId:caseIdForTask(ctx.workflowId,ctx.taskId),
  taskId:publicTaskRef(ctx.workflowId,ctx.taskId),
  verdict:'REWORK',reason:'Invoice subtotal does not match the original lines.',
  receiptId:'servjury-1234567890abcdef',source:'GenLayer finalized on-chain state',
  filingTxHash:'0x'+'a'.repeat(64),adjudicationTxHash:'0x'+'b'.repeat(64),
};
test('only a new strictly verified transaction pair can authorize task completion',()=>{
  const output=buildVerifiedTaskOutput(receipt,ctx);
  const result=JSON.parse(output);
  assert.equal(result.caseId,receipt.caseId);
  assert.equal(result.verdict,'REWORK');
  assert.equal(result.filingTxHash,receipt.filingTxHash);
  assert.ok(confirmCompletedTask({id:ctx.taskId,status:'done',output}, {...ctx,output}));
});
test('historic DECIDED case without two freshly verified TXs is not an E2E completion',()=>{
  for(const key of ['filingTxHash','adjudicationTxHash']){
    assert.throws(()=>buildVerifiedTaskOutput({...receipt,[key]:null},ctx),/Both freshly verified/);
  }
  assert.throws(()=>buildVerifiedTaskOutput({...receipt,adjudicationTxHash:'0x1234'},ctx),/Both freshly verified/);
});
test('wrong workflow, task, reason or provenance cannot complete a task',()=>{
  assert.throws(()=>buildVerifiedTaskOutput(receipt,{...ctx,taskId:1}),/mismatched/);
  for(const [k,v] of [['caseId','sj_wrong'],['taskId','os_wrong'],['verdict','INVENTED'],['reason',''],['source','AI supplied'],['receiptId','fake']]){
    assert.throws(()=>buildVerifiedTaskOutput({...receipt,[k]:v},ctx),/mismatched/);
  }
});
test('status DONE is not accepted without a matching persisted task output',()=>{
  const output=buildVerifiedTaskOutput(receipt,ctx);
  for(const detail of [{id:ctx.taskId,status:'human-assistance-required',output},{id:ctx.taskId,status:'error',output},{id:1,status:'done',output},{id:ctx.taskId,status:'done',output:'other'},{id:ctx.taskId,status:'done',output:null}]){
    assert.throws(()=>confirmCompletedTask(detail,{...ctx,output}),/not confirmed/);
  }
});
test('legacy profile never enables completeTask; E2E profile requires explicit opt-in',()=>{
  const legacy=selectOpenServProfile({});
  const isolated=selectOpenServProfile({SERVJURY_AGENT_PROFILE:'e2e'});
  assert.equal(legacy.id,'legacy');
  assert.equal(isolated.id,'e2e');
  assert.notEqual(legacy.workflowName,isolated.workflowName);
  assert.notEqual(legacy.agentName,isolated.agentName);
  assert.equal(allowsVerifiedTaskCompletion(legacy,{SERVJURY_COMPLETE_VERIFIED_TASK:'1'}),false);
  assert.equal(allowsVerifiedTaskCompletion(isolated,{}),false);
  assert.equal(allowsVerifiedTaskCompletion(isolated,{SERVJURY_COMPLETE_VERIFIED_TASK:'1'}),true);
  assert.throws(()=>selectOpenServProfile({SERVJURY_COMPLETE_VERIFIED_TASK:'1'}),/forbidden/);
  assert.throws(()=>selectOpenServProfile({SERVJURY_AGENT_PROFILE:'unreviewed'}),/Unknown/);
});
