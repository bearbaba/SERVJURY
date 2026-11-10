import test from 'node:test';
import assert from 'node:assert/strict';
import { originalWebhookEvidence } from '../src/openserv-trusted-input.mjs';
const source = {
  terms: 'Calculate subtotals and total',
  delivery: 'INV-B 90 USD; Total 130 USD',
  evidence: 'Original invoice rows. No verdict or corrected answer supplied.',
};
function action(value=source) {
  return { task: { triggerEvent: { payload: [{event: {...value}}] } },
    triggerEvents: [{payload:[{event:{...value}}]}] };
}
test('original immutable webhook evidence is preserved exactly', ()=>{
  assert.deepEqual(originalWebhookEvidence(action(), 'task-123'), {taskId:'task-123', ...source, scenario:''});
});
test('OpenServ model-added verdict and suggested calculation cannot override webhook input',()=>{
  const fabricatedArgs={...source, evidence:source.evidence+' REWORK because 90 should be 60; correct total 100.'};
  const original=originalWebhookEvidence(action(),'task-123');
  assert.equal(original.evidence,source.evidence);
  assert.notEqual(original.evidence,fabricatedArgs.evidence);
});
test('missing webhook source fails closed instead of trusting AI-supplied args',()=>{
  assert.throws(()=>originalWebhookEvidence({task:{}},'task-123'),/original authenticated webhook evidence missing/i);
});
test('contradictory authenticated trigger snapshots fail closed',()=>{
  const a=action();a.triggerEvents[0].payload[0].event.evidence='tampered';
  assert.throws(()=>originalWebhookEvidence(a,'task-123'),/envelopes disagree/);
});
test('oversized source evidence is rejected by shared validator',()=>{
  const a=action({...source,evidence:'z'.repeat(4001)});
  assert.throws(()=>originalWebhookEvidence(a,'task-123'),/Invalid evidence/);
});
