// Standalone READ-ONLY reproduction of the Studionet SDK finality waiter
// against an independently verified historical public TX. No signing keys.
import {createClient,createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus} from 'genlayer-js/types';
import {isFinalizedSuccess} from '../src/genlayer.mjs';
import {provenGenVMExecutionName} from '../src/genlayer-tx-status.mjs';

const defaultHash='0x0dff748ffba13d1f8a036e28cd6bc171d75528e42bdbe425daea013afdbdce6f';
const hash=process.env.SERVJURY_DIAGNOSE_TX_HASH||defaultHash;
if(!/^0x[0-9a-fA-F]{64}$/.test(hash)||studionet.id!==61999)throw Error('Invalid Studionet TX hash or chain ID');
const c=createClient({chain:studionet,account:createAccount('0x'+'11'.repeat(32))});
console.log('STUDIONET_SAME_HASH_WAIT_PROBE',JSON.stringify({hash,chainId:61999,readonly:true}));
let stored;
try {stored=await c.getTransaction({hash});}
catch {console.log('SAME_HASH_DIRECT_READ_UNAVAILABLE');process.exit(1);}
const status=String(stored?.statusName||'UNKNOWN');
const exec=provenGenVMExecutionName(stored)||'UNCONFIRMED';
console.log('SAME_HASH_DIRECT_READ',JSON.stringify({status,execution:exec,confirmed:isFinalizedSuccess(stored)}));
if(!isFinalizedSuccess(stored)) {
  console.log('SAME_HASH_NOT_PROVEN_FINAL_SUCCESS; do not use for waiter comparison.');
  process.exit(1);
}
const limitMs=10000;
let timeoutId;
const task=Promise.resolve().then(()=>c.waitForTransactionReceipt({
  hash,status:TransactionStatus.FINALIZED,fullTransaction:true,
})).then(
  result=>({kind:'RESOLVED',status:String(result?.statusName||'UNKNOWN'),
    execution:provenGenVMExecutionName(result)||'UNCONFIRMED',confirmed:isFinalizedSuccess(result)}),
  error=>({kind:'REJECTED',errorName:String(error?.name||'Unknown').slice(0,80)}),
);
const timed=new Promise(resolve=>{
  timeoutId=setTimeout(()=>resolve({kind:'TIMED_OUT'}),limitMs);
});
const outcome=await Promise.race([task,timed]);
clearTimeout(timeoutId);
console.log('SAME_HASH_SDK_WAITER',JSON.stringify(outcome));
if(outcome.kind==='TIMED_OUT') {
  console.log('SDK waiter did not resolve after direct stored receipt confirmed success; do not infer any new TX failure.');
  process.exit(0); // stop any SDK polling handles for this diagnostic process
}
console.log('READ_ONLY_COMPLETE: no signing key, no writeContract, no OpenServ mutation.');
