import test from 'node:test';
import assert from 'node:assert/strict';
import { isFinalizedSuccess } from '../src/genlayer.mjs';

test('requires both FINALIZED and successful GenVM execution', () => {
  assert.equal(isFinalizedSuccess({statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_RETURN'}),true);
  assert.equal(isFinalizedSuccess({statusName:'ACCEPTED',txExecutionResultName:'FINISHED_WITH_RETURN'}),false);
  assert.equal(isFinalizedSuccess({statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_ERROR'}),false);
  assert.equal(isFinalizedSuccess({statusName:'FINALIZED'}),false);
  assert.equal(isFinalizedSuccess(null),false);
});
