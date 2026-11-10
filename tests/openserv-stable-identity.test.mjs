import test from 'node:test';
import assert from 'node:assert/strict';
import { stableTaskIdentity, verifyLivePlatformTask } from '../src/openserv-stable-identity.mjs';
import { caseIdForTask, publicTaskRef } from '../src/openserv-bridge.mjs';

const config={workflowId:14061,agentId:4953};
const fixture=(workspaceToken,taskToken,nodes=[{type:'task',taskId:750590}])=>({
  me:{id:4953},
  workspace:{id:workspaceToken},
  task:{
    id:taskToken,
    description:'Use adjudicate_delivery to return a finalized GenLayer verdict to the original task log.',
    triggerEvent:{name:'webhook',payload:[{event:{terms:'Term',delivery:'Output',evidence:'Rows'}}]},
  },
  workflow:{nodes},
});

test('selects stable task graph ID rather than per-invocation OpenServ update tokens',()=>{
  const first=stableTaskIdentity(fixture('secret-workspace-UUID-A','secret-task-UUID-A'),config);
  const second=stableTaskIdentity(fixture('secret-workspace-UUID-B','secret-task-UUID-B'),config);
  assert.deepEqual(first,{workflowId:14061,taskId:750590});
  assert.deepEqual(second,first);
  assert.equal(caseIdForTask(first.workflowId,first.taskId),caseIdForTask(second.workflowId,second.taskId));
  assert.equal(publicTaskRef(first.workflowId,first.taskId),publicTaskRef(second.workflowId,second.taskId));
});

test('numeric task ID must appear in the authenticated workflow graph',()=>{
  assert.deepEqual(stableTaskIdentity(fixture('opaque','750590'),config),{workflowId:14061,taskId:750590});
  assert.throws(()=>stableTaskIdentity(fixture('opaque',750591),config),/Ambiguous/);
});

test('multiple graph tasks and opaque runtime task ID fail closed',()=>{
  const nodes=[{type:'task',taskId:750590},{type:'task',taskId:750591}];
  assert.throws(()=>stableTaskIdentity(fixture('opaque','opaque-task',nodes),config),/Ambiguous/);
});

test('mismatched agent ID and invalid provenance are blocked',()=>{
  const wrong=fixture('opaque','opaque-task');
  wrong.me.id=999;
  assert.throws(()=>stableTaskIdentity(wrong,config),/mismatch/);
  const missing=fixture('opaque','opaque-task');
  delete missing.task.triggerEvent;
  assert.throws(()=>stableTaskIdentity(missing,config),/missing/);
});

test('authenticated task must match canonical ID, assignee and description',()=>{
  const task={id:750590,assigneeAgentId:4953,status:'in-progress',description:'Real task description'};
  assert.equal(verifyLivePlatformTask(task,{taskId:750590,agentId:4953,expectedDescription:task.description}),true);
  assert.throws(()=>verifyLivePlatformTask({...task,assigneeAgentId:1},{taskId:750590,agentId:4953}),/mismatch/);
  assert.throws(()=>verifyLivePlatformTask({...task,description:'tampered'},{taskId:750590,agentId:4953,expectedDescription:task.description}),/description mismatch/);
});

test('human-assistance-required and terminal OpenServ tasks cannot sign',()=>{
  const task={id:750590,assigneeAgentId:4953,status:'human-assistance-required'};
  const context={taskId:750590,agentId:4953};
  assert.throws(()=>verifyLivePlatformTask(task,context),/runnable status/);
  assert.throws(()=>verifyLivePlatformTask({...task,status:'done'},context),/runnable status/);
  assert.throws(()=>verifyLivePlatformTask({...task,status:'cancelled'},context),/runnable status/);
});

test('runtime error and unknown statuses cannot trigger any fresh GenLayer signature',()=>{
  const context={taskId:750591,agentId:4953};
  const base={id:750591,assigneeAgentId:4953,description:'VERIFIED',status:'to-do'};
  assert.equal(verifyLivePlatformTask(base,context),true);
  for(const status of ['Unexpected Error','unexpected-error','failed','error','cancelled','completed','blocked','paused','',null]) {
    assert.throws(()=>verifyLivePlatformTask({...base,status},context),/runnable status/);
  }
});
