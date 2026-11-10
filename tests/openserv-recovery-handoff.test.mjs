import test from 'node:test';
import assert from 'node:assert/strict';
import {caseIdForTask,publicTaskRef} from '../src/openserv-bridge.mjs';
import {validateRecoveryTask,buildReadbackHandoff} from '../src/openserv-recovery-handoff.mjs';

const workflowId=14061,taskId=750591,agentId=4953;
const state={
  case_id:caseIdForTask(workflowId,taskId),
  task_id:publicTaskRef(workflowId,taskId),
  status:'DECIDED',verdict:'REWORK',reason:'Submitted subtotal does not satisfy the stated acceptance criteria.',
};
const task={id:taskId,assigneeAgentId:agentId,status:'human-assistance-required',
  description:'Use adjudicate_delivery to return a finalized GenLayer verdict to the original task log.'};
const filing={hash:'0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376',
  status:'FINALIZED',execution:'FINISHED_WITH_RETURN',recipientMatch:true};
const adjudication={hash:'0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406',
  status:'FINALIZED',recipientMatch:true,caseMatched:true,methodMarked:true,
  executionReceipts:['SUCCESS','ERROR']};

test('recovery is scoped to the exact original task identity and human-assistance state',()=>{
  validateRecoveryTask(task,{workflowId,taskId,agentId});
  for(const status of ['cancelled','done','to-do','in-progress'])
    assert.throws(()=>validateRecoveryTask({...task,status},{workflowId,taskId,agentId}),/awaiting Human Assistance/);
  assert.throws(()=>validateRecoveryTask({...task,id:750592},{workflowId,taskId,agentId}),/not authorized/);
  assert.throws(()=>validateRecoveryTask({...task,assigneeAgentId:999},{workflowId,taskId,agentId}),/not authorized/);
  assert.throws(()=>validateRecoveryTask({...task,description:'other'},{workflowId,taskId,agentId}),/description/);
});

test('recovery reports existing readback, with mixed adjudication results explicitly unconfirmed',()=>{
  const receipt=buildReadbackHandoff(state,filing,adjudication,{workflowId,taskId});
  assert.equal(receipt.caseId,state.case_id);
  assert.equal(receipt.taskId,state.task_id);
  assert.equal(receipt.verdict,'REWORK');
  assert.equal(receipt.status,'ONCHAIN_READBACK_VERIFIED');
  assert.equal(receipt.adjudicationExecution,'MIXED_SUCCESS_ERROR_NOT_UNANIMOUSLY_CONFIRMED');
  assert.equal(receipt.handoffType,'existing-task-log-only');
  assert.match(receipt.receiptId,/^servjury-[0-9a-f]{16}$/);
});

test('task mapping, verdict and stored reason must all be genuine',()=>{
  assert.throws(()=>buildReadbackHandoff({...state,case_id:'sj_fake'},filing,adjudication),/identity mismatch/);
  assert.throws(()=>buildReadbackHandoff({...state,task_id:'os_fake'},filing,adjudication),/identity mismatch/);
  assert.throws(()=>buildReadbackHandoff({...state,status:'FILED',verdict:'PENDING'},filing,adjudication),/No persisted GenLayer verdict/);
  assert.throws(()=>buildReadbackHandoff({...state,reason:' '},filing,adjudication),/no verified/);
});

test('incomplete filing or adjudication proof fails before a log can be constructed',()=>{
  assert.throws(()=>buildReadbackHandoff(state,{...filing,execution:'UNKNOWN'},adjudication),/file_case transaction/);
  assert.throws(()=>buildReadbackHandoff(state,filing,{...adjudication,methodMarked:false}),/adjudicate_case transaction/);
  assert.throws(()=>buildReadbackHandoff(state,filing,{...adjudication,executionReceipts:['SUCCESS','SUCCESS']}),/adjudicate_case transaction/);
  assert.throws(()=>buildReadbackHandoff(state,filing,{...adjudication,recipientMatch:false}),/adjudicate_case transaction/);
  assert.throws(()=>buildReadbackHandoff(state,filing,adjudication,{workflowId:14061,taskId:750590}),/Unrecognized existing task/);
});
