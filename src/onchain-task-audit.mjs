// Pure and conservative summary of an already persisted GenLayer case.
// It never trusts a verdict without a matching case/task identity.
import { caseIdForTask, publicTaskRef } from './openserv-bridge.mjs';

export function auditStoredTaskState(workflowId, taskId, state) {
  const caseId=caseIdForTask(workflowId,taskId);
  const expectedTaskRef=publicTaskRef(workflowId,taskId);
  if(!state || typeof state!=='object' || Array.isArray(state) ||
     state.case_id!==caseId || state.task_id!==expectedTaskRef) {
    throw Error('On-chain case/task identity mismatch; do not treat as an accepted receipt.');
  }
  const status=state.status;
  const verdict=state.verdict;
  if (status==='FILED' && verdict==='PENDING') {
    return {caseId,publicTaskRef:expectedTaskRef,status:'FILED',result:'FILED_NOT_ADJUDICATED'};
  }
  if(status==='DECIDED' && ['ACCEPT','REWORK','UNVERIFIABLE'].includes(verdict) &&
     typeof state.reason==='string' && state.reason.trim()) {
    return {caseId,publicTaskRef:expectedTaskRef,status:'DECIDED',result:'DECIDED_READBACK',verdict,reasonPresent:true};
  }
  throw Error('Contract state has no verified FILED or DECIDED readback.');
}
