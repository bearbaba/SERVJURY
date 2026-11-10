// The OpenServ runtime's do-task action may replace action.workspace.id and
// action.task.id with per-invocation update-capability tokens (UUIDs). Those
// MUST NOT be used as durable task IDs, task log paths, or public chain IDs.
//
// Resolve the canonical numeric workflow/task from provisioning + signed-in
// platform graph. For multiple task nodes, fail closed instead of guessing.
function numericId(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) return null;
  const n=Number(value);
  return Number.isSafeInteger(n) && n>0 ? n : null;
}

export function stableTaskIdentity(action, { workflowId, agentId }) {
  const workflow=numericId(workflowId), agent=numericId(agentId);
  if (!workflow || !agent || numericId(action?.me?.id) !== agent) {
    throw Error('Authenticated provisioned workflow/agent mismatch; refusing signed review.');
  }
  if (!action?.task?.triggerEvent || !action?.workflow || !Array.isArray(action.workflow.nodes)) {
    throw Error('OpenServ runtime task event/graph missing; refusing to infer a task ID.');
  }
  const graphTaskIds=action.workflow.nodes
    .filter(n=>n?.type==='task').map(n=>numericId(n.taskId)).filter(Boolean);
  const unique=[...new Set(graphTaskIds)];
  const presented=numericId(action.task.id);
  if (presented && unique.includes(presented)) return { workflowId: workflow, taskId: presented };
  // With opaque per-action update tokens, a single graph task is unambiguous.
  // Any multi-node graph must provide the numeric task ID explicitly.
  if (!presented && unique.length===1 && graphTaskIds.length===1) {
    return { workflowId: workflow, taskId: unique[0] };
  }
  throw Error('Ambiguous/stale OpenServ task identity; refusing review or log write.');
}

export function verifyLivePlatformTask(task, { taskId, agentId, expectedDescription }) {
  if(numericId(task?.id)!==taskId || numericId(task?.assigneeAgentId)!==agentId) {
    throw Error('Authenticated OpenServ platform task identity mismatch; refusing signed review.');
  }
  if (typeof expectedDescription==='string' && expectedDescription.trim() &&
      typeof task.description==='string' && task.description !== expectedDescription) {
    throw Error('Authenticated OpenServ task description mismatch; refusing signed review.');
  }
  // Only known runnable statuses can initiate a new GenLayer signature.
  // The platform can surface 'unexpected-error' after AI_InvalidPromptError
  // during Human Assistance recovery. This must NEVER become a signed retry.
  const status=String(task.status||'').trim().toLowerCase();
  if (!['to-do','in-progress'].includes(status)) {
    throw Error('OpenServ task not in a known runnable status; refusing new signed review.');
  }
  return true;
}
