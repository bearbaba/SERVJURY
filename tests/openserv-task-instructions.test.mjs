import test from 'node:test';
import assert from 'node:assert/strict';
import {SERVJURY_TASK_DESCRIPTION,SERVJURY_TASK_BODY,SERVJURY_TASK_INPUT,SERVJURY_TASK_BODY_V2,SERVJURY_TASK_INPUT_V2} from '../src/openserv-task-instructions.mjs';

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

test('E2E workflow has an explicitly nonempty task input rather than SDK empty default',()=>{
  assert.ok(SERVJURY_TASK_INPUT.trim().length>100);
  assert.match(SERVJURY_TASK_INPUT,/authenticated webhook/i);
  assert.match(SERVJURY_TASK_INPUT,/adjudicate_delivery/);
  assert.ok(SERVJURY_TASK_INPUT.includes('\n'));
  assert.doesNotMatch(SERVJURY_TASK_INPUT,/750591|14061/);
});

test('isolated V2 initial task prompt explicitly forbids OpenServ false success when GenLayer is unverified',()=>{
  assert.ok(SERVJURY_TASK_BODY_V2.startsWith(SERVJURY_TASK_BODY));
  assert.ok(SERVJURY_TASK_INPUT_V2.startsWith(SERVJURY_TASK_INPUT));
  assert.match(SERVJURY_TASK_BODY_V2,/NOT_VERIFIED/);
  assert.match(SERVJURY_TASK_BODY_V2,/do not call out_complete_task/i);
  assert.match(SERVJURY_TASK_BODY_V2,/GENLAYER_VERDICT_VERIFIED/);
  assert.match(SERVJURY_TASK_INPUT_V2,/earlier workflows/i);
  for(const text of [SERVJURY_TASK_BODY_V2,SERVJURY_TASK_INPUT_V2]){
    assert.doesNotMatch(text,/750591|750592|14061|14062/);
    assert.ok(text.includes('\n'));
  }
});
