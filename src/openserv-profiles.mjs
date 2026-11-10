// Separate new E2E acceptance resources from historical OpenServ task 750591.
// Never call provision() for the legacy cached workflow just to change its input.
export const LEGACY_OPEN_SERV = Object.freeze({
  id:'legacy',
  agentName:'SERVJURY — Internet Court Review',
  workflowName:'SERVJURY Delivery Review',
});
export const E2E_OPEN_SERV = Object.freeze({
  id:'e2e',
  agentName:'SERVJURY — E2E Acceptance V1',
  workflowName:'SERVJURY E2E Acceptance V1',
});
export function selectOpenServProfile(env=process.env) {
  const kind=env.SERVJURY_AGENT_PROFILE || 'legacy';
  if (!['legacy','e2e'].includes(kind)) {
    throw Error('Unknown SERVJURY_AGENT_PROFILE; only legacy or e2e are allowed.');
  }
  if (kind==='legacy' && env.SERVJURY_COMPLETE_VERIFIED_TASK==='1') {
    throw Error('Verified task completion is forbidden on the existing legacy OpenServ workflow.');
  }
  return kind==='e2e' ? E2E_OPEN_SERV : LEGACY_OPEN_SERV;
}
export function allowsVerifiedTaskCompletion(profile, env=process.env) {
  return profile.id==='e2e' && env.SERVJURY_COMPLETE_VERIFIED_TASK==='1';
}
