// Reusing provisioned credentials avoids calling the OpenServ workflow.sync()
// on every agent restart. The SDK's sync sends task status='to-do' and may
// replace workflow task IDs. This is unsafe when recovering live executions.
export function decideOpenServProvisionMode(cached, explicitProvisionOptIn) {
  if (cached) {
    const idOk = Number.isSafeInteger(Number(cached.agentId)) && Number(cached.agentId) > 0
      && Number.isSafeInteger(Number(cached.workflowId)) && Number(cached.workflowId) > 0;
    if (!idOk || typeof cached.apiKey !== 'string' || !cached.apiKey ||
        typeof cached.authToken !== 'string' || !cached.authToken) {
      throw new Error('Cached OpenServ state is incomplete; refusing implicit workflow synchronization.');
    }
    return 'reuse';
  }
  if (explicitProvisionOptIn === '1') return 'provision';
  throw new Error('No cached OpenServ agent credentials. Explicit SERVJURY_ALLOW_INITIAL_PROVISION=1 is required to provision a workflow.');
}
