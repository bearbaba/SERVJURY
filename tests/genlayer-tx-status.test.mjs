import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeStoredGenLayerTx} from '../src/genlayer-tx-status.mjs';
const addr='0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
const tx=(statusName,txExecutionResultName)=>({statusName,txExecutionResultName,recipient:addr});
test('GenLayer finalized success still requires get_case readback',()=>{
  assert.equal(summarizeStoredGenLayerTx(tx('FINALIZED','FINISHED_WITH_RETURN'),addr).result,'FINALIZED_SUCCESS_CHECK_CASE_STATE');
});
test('GenLayer finalized GenVM error is NOT a successful filing',()=>{
  assert.equal(summarizeStoredGenLayerTx(tx('FINALIZED','FINISHED_WITH_ERROR'),addr).result,'FINALIZED_EXECUTION_ERROR');
});
test('accepted and pending transactions never authorize signing again',()=>{
  for(const s of ['PENDING','ACCEPTED','COMMITTING','REVEALING'])
    assert.equal(summarizeStoredGenLayerTx(tx(s,'FINISHED_WITH_RETURN'),addr).result,'NOT_FINALIZED_DO_NOT_RETRY');
});
test('the target contract must match exactly',()=>{
  assert.equal(summarizeStoredGenLayerTx({...tx('FINALIZED','FINISHED_WITH_RETURN'),recipient:'0x'+'00'.repeat(20)},addr).result,'WRONG_CONTRACT');
});
test('missing recipient or ambiguous execution fail closed',()=>{
  assert.equal(summarizeStoredGenLayerTx({statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_RETURN'},addr).result,'RECIPIENT_UNVERIFIED');
  assert.equal(summarizeStoredGenLayerTx(tx('FINALIZED','UNKNOWN'),addr).result,'FINALIZED_NOT_PROVEN_SUCCESS');
});

test('SDK numeric GenVM execution result is authoritative when symbolic field absent',()=>{
  assert.equal(summarizeStoredGenLayerTx({...tx('FINALIZED',undefined),txExecutionResult:1},addr).result,'FINALIZED_SUCCESS_CHECK_CASE_STATE');
  assert.equal(summarizeStoredGenLayerTx({...tx('FINALIZED',undefined),txExecutionResult:2},addr).result,'FINALIZED_EXECUTION_ERROR');
  assert.equal(summarizeStoredGenLayerTx({...tx('FINALIZED',undefined),txExecutionResult:0},addr).result,'FINALIZED_NOT_PROVEN_SUCCESS');
});
test('consensus majority result is not a GenVM execution result',()=>{
  assert.equal(summarizeStoredGenLayerTx({...tx('FINALIZED',undefined),result:1},addr).result,'FINALIZED_NOT_PROVEN_SUCCESS');
});
