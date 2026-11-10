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
  // Field *names only*. No original calldata, evidence, sender keys, trace
  // bodies or private OpenServ update tokens are emitted.
  const fields=Object.keys(tx).filter(key=>/^(status|tx|exec|result|recipient|method|call|data|consensus|lifecycle)/i.test(key)).slice(0,50);
  console.log('GENLAYER_TRANSACTION_FIELD_NAMES',JSON.stringify(fields));
  console.log('GENLAYER_SAFE_NESTED_SHAPES',JSON.stringify(Object.fromEntries(
    ['data','consensus_data','tx_data','result'].map(key=>{
      const value=tx[key];
      return [key,{type:typeof value,keys:value&&typeof value==='object' ? Object.keys(value).slice(0,35) : []}];
    })
  )));
  const lr=tx.consensus_data?.leader_receipt;
  console.log('GENLAYER_LEADER_RECEIPT_FIELD_NAMES',JSON.stringify(lr && typeof lr==='object' ? Object.keys(lr).slice(0,50) : []));
  if(Array.isArray(lr)) console.log('GENLAYER_LEADER_RECEIPT_SHAPE',JSON.stringify(lr.slice(0,8).map((value,index)=>({
    index,type:typeof value,isSmallInteger:typeof value==='number' && Number.isInteger(value) && value>=0 && value<=5,
    smallInteger:typeof value==='number' && Number.isInteger(value) && value>=0 && value<=5 ? value : null,
    objectKeys:value && typeof value==='object' ? Object.keys(value).slice(0,20) : [],
    length:typeof value==='string' ? value.length : null,
  }))));

  if(Array.isArray(lr))console.log('GENLAYER_SAFE_LEADER_EXECUTION_FIELDS',JSON.stringify(lr.slice(0,3).map(entry=>Object.fromEntries(
    ['vote','result','genvm_result','execution_result'].map(field=>{
      const v=entry?.[field];
      return [field,{
        type:typeof v,
        code:typeof v==='number' && Number.isInteger(v) && v>=0 && v<=10 ? v : null,
        enum:typeof v==='string' && /^[A-Za-z_]{1,40}$/.test(v) ? v : null,
        fields:v && typeof v==='object' ? Object.keys(v).slice(0,25) : []
      }];
    })
  ))));
  if(tx.txDataDecoded && typeof tx.txDataDecoded==='object') {
    console.log('GENLAYER_DECODED_FIELD_NAMES',JSON.stringify(Object.keys(tx.txDataDecoded).slice(0,25)));
  }
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
