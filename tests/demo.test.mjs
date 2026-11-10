import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, demoDecision, validateCase } from '../src/engine.mjs';

for (const [scenario, fixture] of Object.entries(scenarios)) {
  test(`${scenario} fixture produces the explicitly simulated outcome`,()=>{
    assert.deepEqual(demoDecision({...fixture,scenario}),{verdict:fixture.verdict,reason:fixture.reason});
  });
}
test('modified evidence does not inherit the canned fixture verdict',()=>{
  const modified={...scenarios.success,scenario:'success',evidence:'No proof supplied'};
  assert.equal(demoDecision(modified).verdict,'UNVERIFIABLE');
});
test('custom or unknown scenario cannot masquerade as consensus',()=>{
  assert.equal(demoDecision({...scenarios.success,scenario:'nonexistent'}).verdict,'UNVERIFIABLE');
});
test('validation blocks empty/malformed/oversized case fields',()=>{
  assert.throws(()=>validateCase({...scenarios.rework,taskId:''}),/Invalid taskId/);
  assert.throws(()=>validateCase({...scenarios.rework,evidence:'a'.repeat(4001)}),/Invalid evidence/);
  assert.throws(()=>validateCase(null),/Invalid request/);
});
test('validation preserves evidence fields without inventing a result',()=>{
  const record=validateCase({...scenarios.rework,scenario:'rework'});
  assert.equal(record.evidence,scenarios.rework.evidence);
  assert.equal(record.verdict,undefined);
});
