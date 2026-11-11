import test from 'node:test';
import assert from 'node:assert/strict';
import {validateV3ReadyRecord,assertV3AgentLocallyReady} from '../src/openserv-agent-readiness.mjs';

const expected={workflowId:28803,agentId:58803};
const marker={profile:'e2e-v3',...expected,pid:12345,port:7378,
  transport:'sdk-tunnel',startedAt:'2026-11-11T03:00:00.000Z'};
const dependencies={
  read:async()=>JSON.stringify(marker),
  checkPid:(pid)=>assert.equal(pid,12345),
  get:async(url)=>{assert.equal(url,'http://127.0.0.1:7378/health');return {ok:true};},
};
test('V3 readiness requires exact newly provisioned workflow and agent IDs',()=>{
  assert.deepEqual(validateV3ReadyRecord(marker,expected),{pid:12345,port:7378});
  for(const altered of [
    {...marker,profile:'e2e-v2'}, {...marker,workflowId:14063},
    {...marker,agentId:4955}, {...marker,port:0},{...marker,pid:0},
    {...marker,transport:'http'}, {...marker,startedAt:'unknown'},
  ])assert.throws(()=>validateV3ReadyRecord(altered,expected),/mismatch/);
});
test('a live local V3 process and health endpoint are prerequisites, NOT proxy proof',async()=>{
  const result=await assertV3AgentLocallyReady(expected,dependencies);
  assert.deepEqual(result,{...expected,localAgentHealthy:true,remoteTunnelVerified:false});
});
test('missing marker or stopped process fails closed without triggering tasks',async()=>{
  await assert.rejects(()=>assertV3AgentLocallyReady(expected,{...dependencies,read:async()=>{throw Error('ENOENT');}}),/marker missing/);
  await assert.rejects(()=>assertV3AgentLocallyReady(expected,{...dependencies,checkPid:()=>{throw Error('ESRCH');}}),/not alive/);
});
test('unhealthy or unreachable local endpoint fails closed',async()=>{
  await assert.rejects(()=>assertV3AgentLocallyReady(expected,{...dependencies,get:async()=>({ok:false})}),/did not return success/);
  await assert.rejects(()=>assertV3AgentLocallyReady(expected,{...dependencies,get:async()=>{throw Error('ECONNREFUSED');}}),/health check failed/);
});
