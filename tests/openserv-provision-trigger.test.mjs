import test from 'node:test';
import assert from 'node:assert/strict';
import { decideOpenServProvisionMode } from '../src/openserv-provision-state.mjs';
import { summarizeTriggerResult } from '../src/openserv-trigger-result.mjs';

const cached={
  agentId:4953,workflowId:14061,apiKey:'fixture-agent-api-key',authToken:'fixture-auth-token',
};
test('reconnect cached OpenServ credentials without workflow.sync or task reset',()=>{
  assert.equal(decideOpenServProvisionMode(cached,undefined),'reuse');
  assert.equal(decideOpenServProvisionMode(cached,'1'),'reuse');
});
test('initial workflow provisioning requires explicit opt-in',()=>{
  assert.throws(()=>decideOpenServProvisionMode(null,undefined),/SERVJURY_ALLOW_INITIAL_PROVISION/);
  assert.equal(decideOpenServProvisionMode(null,'1'),'provision');
});
test('incomplete cached credentials never trigger implicit workflow recreation',()=>{
  for(const key of ['apiKey','authToken','workflowId','agentId']){
    assert.throws(()=>decideOpenServProvisionMode({...cached,[key]:null},'1'),/incomplete/);
  }
});

test('OpenServ HTTP 200 application error is never reported as success',()=>{
  const response={_keepalive:true,status:'error',error:{message:'Bearer sensitive-token-should-never-print'}};
  const result=summarizeTriggerResult(response);
  assert.deepEqual(result,{status:'ERROR',result:'ERROR',errorPresent:true});
  assert.doesNotMatch(JSON.stringify(result),/Bearer|sensitive-token/);
});
test('OpenServ error field takes precedence over nominal HTTP success',()=>{
  assert.equal(summarizeTriggerResult({status:'success',error:'failed'}).result,'ERROR');
});
test('accepted or pending webhook is not proof of completed workflow',()=>{
  assert.equal(summarizeTriggerResult({status:'accepted'}).result,'PENDING');
  assert.equal(summarizeTriggerResult({status:'pending'}).result,'PENDING');
  assert.equal(summarizeTriggerResult({status:'running'}).result,'PENDING');
});
test('success response still cannot be mistaken for GenLayer finality',()=>{
  assert.equal(summarizeTriggerResult({status:'success',error:null}).result,'ACKNOWLEDGED_NOT_VERIFIED');
});
test('unknown response remains unconfirmed and never emits raw bodies',()=>{
  const result=summarizeTriggerResult({status:'other',error:null,token:'private'});
  assert.equal(result.result,'UNCONFIRMED');
  assert.equal(result.status,'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(result),/private/);
});
