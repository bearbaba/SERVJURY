import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMissingCaseWithCalibratedProbe, rpcExecutionFailureSignature,
  KNOWN_PRESENT_CASE, KNOWN_ABSENT_SENTINEL,
} from '../src/genlayer-missing.mjs';
const genericMissing = () => Object.assign(new Error('Missing or invalid parameters.\nDouble check you have provided the correct parameters.'), {
  name: 'InvalidInputRpcError', code: -32000, details: 'execution failed',
});
const reference = { case_id: KNOWN_PRESENT_CASE, status: 'DECIDED', verdict: 'ACCEPT' };

test('real hosted RPC unknown-case shape is recognized narrowly', () => {
  assert.equal(rpcExecutionFailureSignature(genericMissing()), 'InvalidInputRpcError:-32000:execution failed');
  assert.equal(rpcExecutionFailureSignature(Error('gen_call execution failed')), null);
  assert.equal(rpcExecutionFailureSignature(Object.assign(Error('timeout'), {name:'InvalidInputRpcError',code:-32000,details:'timeout'})),null);
});

test('calibrated live missing-case response is eligible for first filing', async () => {
  let controls = 0;
  await assert.rejects(classifyMissingCaseWithCalibratedProbe({
    targetError: genericMissing(),
    readKnownCase: async (id) => { controls++; assert.equal(id,KNOWN_PRESENT_CASE); return reference; },
    readAbsentSentinel: async (id) => { controls++;assert.equal(id,KNOWN_ABSENT_SENTINEL);throw genericMissing(); },
  }), /Unknown case.*calibrated/);
  assert.equal(controls,2);
});

test('RPC timeout refuses to classify unknown case or invoke probes', async () => {
  let probes = 0;
  await assert.rejects(classifyMissingCaseWithCalibratedProbe({
    targetError: Error('RPC timeout'),
    readKnownCase: async()=>{probes++; return reference},
    readAbsentSentinel: async()=>{probes++;throw genericMissing()},
  }), /RPC timeout/);
  assert.equal(probes,0);
});

test('positive control failure prevents any filing conclusion', async () => {
  await assert.rejects(classifyMissingCaseWithCalibratedProbe({
    targetError: genericMissing(),
    readKnownCase: async()=> { throw Error('RPC node offline'); },
    readAbsentSentinel: async()=>{ throw genericMissing(); },
  }), /RPC node offline/);
});

test('wrong known-case state blocks first filing', async () => {
  await assert.rejects(classifyMissingCaseWithCalibratedProbe({
    targetError: genericMissing(),
    readKnownCase: async()=>({...reference,status:'FILED'}),
    readAbsentSentinel: async()=>{throw genericMissing();},
  }), /positive control failed/);
});

test('unexpected existing sentinel blocks first filing', async () => {
  await assert.rejects(classifyMissingCaseWithCalibratedProbe({
    targetError: genericMissing(), readKnownCase:async()=>reference,
    readAbsentSentinel: async()=>({case_id:KNOWN_ABSENT_SENTINEL}),
  }), /inconclusive/);
});

test('negative control with a different RPC failure blocks first filing', async () => {
  await assert.rejects(classifyMissingCaseWithCalibratedProbe({
    targetError: genericMissing(), readKnownCase:async()=>reference,
    readAbsentSentinel: async()=>{throw Error('network down');},
  }), /inconclusive/);
});
