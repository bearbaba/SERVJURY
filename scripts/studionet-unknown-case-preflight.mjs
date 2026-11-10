// Zero-signature positive/negative RPC calibration against the deployed
// SERVJURY Studionet contract. Never triggers file_case or adjudicate_case.
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import {
  classifyMissingCaseWithCalibratedProbe,
  KNOWN_PRESENT_CASE, KNOWN_ABSENT_SENTINEL,
} from '../src/genlayer-missing.mjs';
const address='0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
const target='sj__ci_unfiled_target_20261110_5b59c7';
const client=createClient({
  chain:studionet, account:createAccount('0x'+'11'.repeat(32)),
});
const read=async(caseId)=>{
  const result=await client.readContract({address,functionName:'get_case',args:[caseId]});
  return typeof result==='string' ? JSON.parse(result) : result;
};
let unknownError=null;
try {
  await read(target);
} catch(error) {
  unknownError=error;
}
if(!unknownError) throw Error('Expected never-filed target to be absent');
let calibrated=false;
try {
  await classifyMissingCaseWithCalibratedProbe({
    targetError:unknownError,
    readKnownCase:read,
    readAbsentSentinel:read,
  });
} catch(error) {
  if(error?.code==='GENLAYER_UNKNOWN_CASE_PROBED') calibrated=true;
  else throw error;
}
if(!calibrated) throw Error('Hosted RPC missing-case behavior did not calibrate safely');
console.log('GENLAYER_UNKNOWN_CASE_CALIBRATION_OK: existing reference and missing controls agree; no signing.');
