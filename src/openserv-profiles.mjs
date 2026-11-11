// Strictly isolated OpenServ identities: E2E V1 and V2 are frozen historical runs.
// V3 is a fresh identity; never sync, restart or trigger historical runs.
export const LEGACY_OPEN_SERV=Object.freeze({
  id:'legacy',agentName:'SERVJURY — Internet Court Review',
  workflowName:'SERVJURY Delivery Review',launchable:true,
});
export const E2E_OPEN_SERV=Object.freeze({
  id:'e2e',agentName:'SERVJURY — E2E Acceptance V1',
  workflowName:'SERVJURY E2E Acceptance V1',launchable:false,
});
export const E2E_V2_OPEN_SERV=Object.freeze({
  id:'e2e-v2',agentName:'SERVJURY — E2E Acceptance V2',
  workflowName:'SERVJURY E2E Acceptance V2',launchable:false,
});
export const E2E_V3_OPEN_SERV=Object.freeze({
  id:'e2e-v3',agentName:'SERVJURY — E2E Acceptance V3',
  workflowName:'SERVJURY E2E Acceptance V3',launchable:true,
});
export function selectOpenServProfile(env=process.env) {
  const kind=env.SERVJURY_AGENT_PROFILE||'legacy';
  const profile=kind==='legacy'?LEGACY_OPEN_SERV
    :kind==='e2e'?E2E_OPEN_SERV
    :kind==='e2e-v2'?E2E_V2_OPEN_SERV
    :kind==='e2e-v3'?E2E_V3_OPEN_SERV:null;
  if(!profile)throw Error('Unknown SERVJURY_AGENT_PROFILE; allowed: legacy, e2e (frozen), e2e-v2 (frozen), e2e-v3.');
  if(profile.id==='legacy'&&env.SERVJURY_COMPLETE_VERIFIED_TASK==='1') {
    throw Error('Verified task completion is forbidden on the original legacy OpenServ workflow.');
  }
  return profile;
}
export function requireActiveProfile(profile){
  if(!profile?.launchable) {
    const id=profile?.id==='e2e-v2'?'E2E V2 (workflow 14063, task 750593)':'E2E V1 (workflow 14062, task 750592)';
    throw Error('SERVJURY '+id+' is frozen after an incomplete on-chain adjudication. Do not restart, provision or trigger either historical workflow.');
  }
  return profile;
}
export function allowsVerifiedTaskCompletion(profile,env=process.env){
  // Only the fresh isolated V3 workflow may complete a fully verified task.
  return profile?.id==='e2e-v3'&&env.SERVJURY_COMPLETE_VERIFIED_TASK==='1';
}
