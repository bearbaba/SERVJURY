import test from 'node:test';
import assert from 'node:assert/strict';
import { caseIdForTask, publicTaskRef, isUnknownCaseError, verifyStoredCase, verifiedReceipt, runTaskReview } from '../src/openserv-bridge.mjs';

const input = { taskId: '42', terms: 'Give a dated, sourced report', delivery: 'Report A', evidence: 'Citation X' };
const stored = { task_id: publicTaskRef(7,42), terms: input.terms, delivery: input.delivery, evidence: input.evidence, status: 'FILED', verdict: 'PENDING', reason: '' };
const decided = { ...stored, status: 'DECIDED', verdict: 'ACCEPT', reason: 'All terms backed by the source.' };

test('public on-chain task reference cannot reveal OpenServ session/update tokens', () => {
  const privateWorkspace = 'workspace-secret-uuid';
  const privateTask = 'task-secret-uuid';
  const ref = publicTaskRef(privateWorkspace, privateTask);
  assert.match(ref, /^os_[0-9a-f]{32}$/);
  assert.doesNotMatch(ref,/secret|uuid/);
  assert.notEqual(ref, privateTask);
  assert.notEqual(publicTaskRef(privateWorkspace,privateTask),publicTaskRef(privateWorkspace,privateTask+'-other'));
});
test('stable case identity is scoped to both OpenServ workspace and task', () => {
  assert.equal(caseIdForTask(7, 42), caseIdForTask('7', '42'));
  assert.notEqual(caseIdForTask(7, 42), caseIdForTask(8, 42));
  assert.notEqual(caseIdForTask(7, 42), caseIdForTask(7, 43));
  assert.match(caseIdForTask(7, 42), /^sj_[0-9a-f]{24}$/);
});
test('no automatic initial filing unless contract explicitly reports Unknown case', async () => {
  let writes = 0;
  await assert.rejects(runTaskReview({workspaceId:7,taskId:42,input,allowFirstFiling:true,readCase:async()=>{throw Error('RPC timeout')},fileCase:async()=>{writes++}}),/RPC timeout/);
  assert.equal(writes,0);
});
test('Unknown case requires one-time filing permission', async () => {
  let writes = 0;
  await assert.rejects(runTaskReview({workspaceId:7,taskId:42,input,readCase:async()=>{throw Error('Unknown case')},fileCase:async()=>{writes++}}),/ALLOW_FIRST_FILING/);
  assert.equal(writes,0);
});
test('first filing then adjudication returns a real readback receipt', async () => {
  let current = null; let filed = 0; let judged = 0;
  const result = await runTaskReview({workspaceId:7,taskId:42,input,allowFirstFiling:true,
    readCase:async()=>{if(!current) throw Error('Unknown case'); return current;},
    fileCase:async(caseId,publicInput)=>{assert.equal(publicInput.taskId,publicTaskRef(7,42)); filed++;current={...stored};return {txHash:'0xf'}} ,
    judgeCase:async()=>{judged++;current={...decided};return {txHash:'0xabc'}}});
  assert.equal(filed,1);assert.equal(judged,1);
  assert.equal(result.verdict,'ACCEPT');assert.equal(result.taskId,publicTaskRef(7,42));assert.equal(result.filingTxHash,'0xf');assert.equal(result.adjudicationTxHash,'0xabc');
  assert.match(result.receiptId,/^servjury-/);
});
test('existing case never refiles nor rejudges after DECIDED', async () => {
  const result=await runTaskReview({workspaceId:7,taskId:42,input,readCase:async()=>decided,
    fileCase:async()=>{throw Error('MUST_NOT_FILE')},judgeCase:async()=>{throw Error('MUST_NOT_JUDGE')}});
  assert.equal(result.verdict,'ACCEPT');assert.equal(result.filingTxHash,null);assert.equal(result.adjudicationTxHash,null);
});
test('an existing case with different evidence is blocked', async () => {
  await assert.rejects(runTaskReview({workspaceId:7,taskId:42,input,readCase:async()=>({...decided,evidence:'tampered'}),
    fileCase:async()=>{},judgeCase:async()=>{}}),/mismatch: evidence/);
});
test('unverified verdict or empty reason cannot reach OpenServ task log',()=>{
  assert.throws(()=>verifiedReceipt({...decided,reason:''},{caseId:'c',taskId:'42'}),/Missing on-chain/);
  assert.throws(()=>verifiedReceipt({...decided,verdict:'PENDING'},{caseId:'c',taskId:'42'}),/No finalized/);
  assert.throws(()=>verifyStoredCase({...stored,status:'UNKNOWN'},{...input,taskId:publicTaskRef(7,42)}),/Invalid on-chain/);
});
test('unknown-case classifier rejects generic transport failures',()=>{
  assert.equal(isUnknownCaseError(Error('Unknown case')),true);
  assert.equal(isUnknownCaseError(Error('429 network timeout')),false);
  assert.equal(isUnknownCaseError(Error('invalid contract address')),false);
});
test('receipt hash deterministic and derived only from validated chain result',()=>{
  assert.deepEqual(verifiedReceipt(decided,{caseId:'case',taskId:'42'}),verifiedReceipt(decided,{caseId:'case',taskId:'42'}));
});

test('review stage diagnostics identify failed phase without disclosing input or causing writes',async()=>{
  const stages=[];let writes=0;
  await assert.rejects(runTaskReview({workspaceId:7,taskId:42,input,allowFirstFiling:true,
    onStage:stage=>stages.push(stage),
    readCase:async()=>{throw Error('RPC unavailable secret-token-123');},
    fileCase:async()=>{writes++;},judgeCase:async()=>{writes++;},
  }),/RPC unavailable/);
  assert.deepEqual(stages,['genlayer-initial-read']);
  assert.equal(writes,0);
  assert.ok(stages.every(stage=>!stage.includes('secret-token')));
});

test('review stage diagnostics distinguish filing from adjudication without retries',async()=>{
  const stages=[];let current=null;let filed=0;let judged=0;
  await assert.rejects(runTaskReview({workspaceId:7,taskId:42,input,allowFirstFiling:true,
    onStage:stage=>stages.push(stage),
    readCase:async()=>{if(!current)throw Error('Unknown case');return current;},
    fileCase:async()=>{filed++;current={...stored};return {txHash:'0x'+'a'.repeat(64)};},
    judgeCase:async()=>{judged++;throw Error('adjudication unavailable');},
  }),/adjudication unavailable/);
  assert.equal(filed,1);assert.equal(judged,1);
  assert.equal(stages.at(-1),'genlayer-adjudicate-case');
});
