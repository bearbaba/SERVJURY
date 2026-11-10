import test from 'node:test';
import assert from 'node:assert/strict';
import {caseIdForTask,publicTaskRef} from '../src/openserv-bridge.mjs';
import {auditStoredTaskState} from '../src/onchain-task-audit.mjs';
const w=14061,t=750591;
const valid={case_id:caseIdForTask(w,t),task_id:publicTaskRef(w,t),status:'FILED',verdict:'PENDING',reason:''};
test('on-chain read-only audit distinguishes filed and not adjudicated',()=>{
  assert.deepEqual(auditStoredTaskState(w,t,valid),{
    caseId:caseIdForTask(w,t),publicTaskRef:publicTaskRef(w,t),
    status:'FILED',result:'FILED_NOT_ADJUDICATED',
  });
});
test('DECIDED requires valid verdict and nonempty stored reason',()=>{
  assert.equal(auditStoredTaskState(w,t,{...valid,status:'DECIDED',verdict:'REWORK',reason:'Incorrect arithmetic'}).result,'DECIDED_READBACK');
  assert.throws(()=>auditStoredTaskState(w,t,{...valid,status:'DECIDED',verdict:'REWORK',reason:''}),/no verified/);
  assert.throws(()=>auditStoredTaskState(w,t,{...valid,status:'DECIDED',verdict:'MANUAL',reason:'wrong'}),/no verified/);
});
test('mixed workflow task identity is never treated as signed evidence',()=>{
  assert.throws(()=>auditStoredTaskState(w,750590,valid),/identity mismatch/);
  assert.throws(()=>auditStoredTaskState(w,t,{...valid,task_id:'raw-session-update-token'}),/identity mismatch/);
});
