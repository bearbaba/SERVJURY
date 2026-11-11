// A local liveness gate for a fresh, isolated OpenServ E2E run.
// It does NOT prove that the remote proxy/tunnel is currently connected.
// The operator must also observe the SDK "Tunnel connected" message.
import { readFile } from 'node:fs/promises';

export const V3_READY_FILE='.servjury-agent-ready-v3.json';

export function validateV3ReadyRecord(record,{workflowId,agentId}) {
  if (!record || record.profile!=='e2e-v3' ||
    record.workflowId!==workflowId || record.agentId!==agentId ||
    !Number.isSafeInteger(record.pid) || record.pid<=0 ||
    !Number.isSafeInteger(record.port) || record.port<1 || record.port>65535 ||
    record.transport!=='sdk-tunnel' ||
    typeof record.startedAt!=='string' ||
    !Number.isFinite(Date.parse(record.startedAt))) {
    throw Error('V3 readiness marker is absent or mismatches the authenticated workflow/agent.');
  }
  return {pid:record.pid,port:record.port};
}

export async function assertV3AgentLocallyReady({workflowId,agentId},{
  read=readFile, checkPid=(pid)=>process.kill(pid,0),
  get=globalThis.fetch,
}={}) {
  let data;
  try {
    data=JSON.parse(await read(V3_READY_FILE,'utf8'));
  } catch {
    throw Error('V3 Agent readiness marker missing or invalid. Start the V3 Agent in Terminal A first.');
  }
  const {pid,port}=validateV3ReadyRecord(data,{workflowId,agentId});
  try {checkPid(pid);} catch {throw Error('V3 Agent process is not alive. Do NOT trigger OpenServ.');}
  let response;
  try {
    response=await get('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(2500)});
  } catch {throw Error('V3 local health check failed. Do NOT trigger OpenServ.');}
  if(!response?.ok)throw Error('V3 local health endpoint did not return success. Do NOT trigger OpenServ.');
  // Health + PID is a local prerequisite, never a remote-tunnel assertion.
  return {workflowId,agentId,localAgentHealthy:true,remoteTunnelVerified:false};
}
