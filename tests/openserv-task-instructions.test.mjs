import test from 'node:test';
import assert from 'node:assert/strict';
import {SERVJURY_TASK_DESCRIPTION,SERVJURY_TASK_BODY} from '../src/openserv-task-instructions.mjs';

test('new workflow has nonempty description and body for OpenServ task prompt',()=>{
  assert.ok(SERVJURY_TASK_DESCRIPTION.trim().length>=30);
  assert.ok(SERVJURY_TASK_BODY.trim().length>=250);
  for(const word of ['adjudicate_delivery','webhook','DECIDED','GenVM']){
    assert.ok(SERVJURY_TASK_BODY.includes(word),word);
  }
});

test('future workflow task body does not claim stale GenLayer verdict or receipt',()=>{
  assert.doesNotMatch(SERVJURY_TASK_BODY, /0x[0-9a-fA-F]{64}|servjury-[a-f0-9]{16}/);
  assert.doesNotMatch(SERVJURY_TASK_BODY, /750591|14061/);
});
