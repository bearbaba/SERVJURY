import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmFinalizedWrite} from '../src/genlayer.mjs';

const status={FINALIZED:'FINALIZED'};
const fullReceipt={statusName:'FINALIZED',consensus_data:{leader_receipt:[
  {execution_result:'SUCCESS'}, {execution_result:'SUCCESS'},
]}};

test('SDK v1 MUST request fullTransaction to retain legacy GenVM leader receipts',async()=>{
  let queried=false;
  const client={
    waitForTransactionReceipt:async params=>{
      assert.deepEqual(params,{hash:'0xabc',status:'FINALIZED',fullTransaction:true});
      return fullReceipt;
    },
    getTransaction:async()=>{queried=true;throw Error('should not require fallback');},
  };
  const receipt=await confirmFinalizedWrite(client,'0xabc',status);
  assert.equal(receipt,fullReceipt);
  assert.equal(queried,false);
});

test('simplified receipt can safely recover from persisted full transaction with zero writes',async()=>{
  let queries=0;
  const client={
    waitForTransactionReceipt:async()=>({statusName:'FINALIZED',txExecutionResultName:undefined}),
    getTransaction:async({hash})=>{assert.equal(hash,'0xabc');queries++;return fullReceipt;},
  };
  assert.equal(await confirmFinalizedWrite(client,'0xabc',status),fullReceipt);
  assert.equal(queries,1);
});

test('FINALIZED with failed GenVM execution refuses success',async()=>{
  const fail={statusName:'FINALIZED',consensus_data:{leader_receipt:[
    {execution_result:'ERROR'}, {execution_result:'ERROR'},
  ]}};
  const client={waitForTransactionReceipt:async()=>fail,getTransaction:async()=>fail};
  await assert.rejects(confirmFinalizedWrite(client,'0xabc',status),error=>{
    assert.equal(error.txHash,'0xabc');
    return /not confirmed successful/.test(error.message);
  });
});

test('FINALIZED with incomplete or conflicting GenVM execution is not success',async()=>{
  const fail={statusName:'FINALIZED',consensus_data:{leader_receipt:[
    {execution_result:'SUCCESS'}, {execution_result:'ERROR'},
  ]}};
  await assert.rejects(confirmFinalizedWrite({
    waitForTransactionReceipt:async()=>fail,
    getTransaction:async()=>fail,
  },'0xabc',status),/not confirmed successful/);
});
