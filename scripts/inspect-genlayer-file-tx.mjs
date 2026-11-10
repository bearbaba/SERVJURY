// Read one known GenLayer transaction from the public Studionet RPC.
// No signer keys, OpenServ mutations, retries, or fresh transactions.
import {createClient,createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {summarizeStoredGenLayerTx} from '../src/genlayer-tx-status.mjs';

const defaultHash='0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376';
const hash=process.env.SERVJURY_INSPECT_TX_HASH || defaultHash;
const addr=process.env.GENLAYER_CONTRACT_ADDRESS || '0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
if(!/^0x[\da-fA-F]{64}$/.test(hash)||!/^0x[\da-fA-F]{40}$/.test(addr)||studionet.id!==61999) {
  throw new Error('Invalid TX hash, target contract, or Studionet chain');
}
const client=createClient({chain:studionet,account:createAccount('0x'+'11'.repeat(32))});
console.log('SERVJURY_PUBLIC_TX_INSPECT', JSON.stringify({chainId:61999,hash,contract:addr}));
try {
  const tx=await client.getTransaction({hash});
  // Stable Studio RPC is older than the latest API reference. Try its
  // documented read-only receipt and transaction-data endpoints in order.
  // Never print error bodies, raw call arguments or any private credentials.
  let direct=null;
  let source='';
  for(const method of ['gen_getTransactionReceipt','gen_getTransactionData']){
    try {
      const rawResponse=await fetch('https://studio.genlayer.com/api',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:[{txId:hash}]}),
        signal:AbortSignal.timeout(12000),
      });
      if(!rawResponse.ok)throw Error('RPC transport failure');
      const data=await rawResponse.json();
      if(data?.error || !data?.result) {
        const code=Number(data?.error?.code);
        console.log('GENLAYER_RPC_METHOD_UNAVAILABLE',JSON.stringify({method,code:Number.isFinite(code)?code:null}));
        continue;
      }
      direct=data.result;
      source=method;
      break;
    } catch {
      console.log('GENLAYER_RPC_METHOD_UNAVAILABLE',JSON.stringify({method,code:null}));
    }
  }
  const consistent=direct &&
    String(direct.statusName||'').toUpperCase()===String(tx.statusName||'').toUpperCase() &&
    String(direct.recipient||'').toLowerCase()===String(tx.recipient||'').toLowerCase();
  if(direct && !consistent){
    throw new Error('Node raw receipt does not agree with SDK stored transaction; refusing result.');
  }
  const result=summarizeStoredGenLayerTx(direct ? {...tx,txExecutionResultName:direct.txExecutionResultName,txExecutionResult:direct.txExecutionResult} : tx,addr);
  console.log('GENLAYER_EXECUTION_SOURCE', direct ? source : 'SDK_STORED_TRANSACTION');
  console.log('GENLAYER_STORED_TX_RESULT',JSON.stringify(result));
  if(result.result!=='FINALIZED_SUCCESS_CHECK_CASE_STATE') {
    console.log('NO_AUTHORIZATION_TO_RETRY: inspect GenLayer transaction and original case before any additional signing.');
  } else {
    console.log('SUCCESSFUL_EXECUTION_CANDIDATE: contract get_case readback and task-log confirmation still required.');
  }
} catch(error) {
  const code=Number(error?.code || error?.cause?.code);
  const status=Number(error?.response?.status);
  console.error('GENLAYER_TX_LOOKUP_UNCONFIRMED',JSON.stringify({
    rpcCode:Number.isFinite(code)&&code!==0 ? code:null,
    httpStatus:Number.isFinite(status)&&status!==0 ? status:null,
  }));
  console.error('Do not retry or assume the GenLayer transaction has failed.');
  process.exitCode=1;
}
