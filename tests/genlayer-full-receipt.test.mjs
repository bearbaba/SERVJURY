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

test('timeout after signed file_case reads the SAME hash and accepts only finalized GenVM success',async()=>{
  let waits=0,reads=0;
  const client={
    waitForTransactionReceipt:async params=>{
      assert.deepEqual(params,{hash:'0xabc',status:'FINALIZED',fullTransaction:true});
      waits++;
      throw new Error('Hosted Studionet receipt wait timed out');
    },
    getTransaction:async({hash})=>{
      assert.equal(hash,'0xabc');reads++;
      return fullReceipt;
    },
    writeContract:async()=>{throw Error('must NEVER re-sign during receipt recovery');},
  };
  assert.equal(await confirmFinalizedWrite(client,'0xabc',status),fullReceipt);
  assert.equal(waits,1);
  assert.equal(reads,1);
});

test('failed wait and unconfirmed read preserve original txHash, never assume success',async()=>{
  const client={
    waitForTransactionReceipt:async()=>{throw Error('timeout');},
    getTransaction:async()=>({statusName:'ACCEPTED',consensus_data:{leader_receipt:[
      {execution_result:'SUCCESS'},{execution_result:'SUCCESS'},
    ]}}),
    writeContract:async()=>{throw Error('must not re-sign');},
  };
  await assert.rejects(confirmFinalizedWrite(client,'0xabc',status),error=>{
    assert.equal(error.txHash,'0xabc');
    assert.match(error.message,/not confirmed successful/);
    return true;
  });
});

test('failed wait and RPC read error fail closed with TX hash for manual lookup',async()=>{
  let count=0;
  const client={
    waitForTransactionReceipt:async()=>{count++;throw Error('wait outage');},
    getTransaction:async({hash})=>{count++;assert.equal(hash,'0xabc');throw Error('RPC unavailable');},
  };
  await assert.rejects(confirmFinalizedWrite(client,'0xabc',status),error=>{
    assert.equal(error.txHash,'0xabc');
    return true;
  });
  assert.equal(count,2);
});

test('failed wait with FINALIZED but mixed GenVM receipts remains unconfirmed',async()=>{
  const client={
    waitForTransactionReceipt:async()=>{throw Error('timeout');},
    getTransaction:async()=>({statusName:'FINALIZED',consensus_data:{leader_receipt:[
      {execution_result:'SUCCESS'},{execution_result:'ERROR'},
    ]}}),
  };
  await assert.rejects(confirmFinalizedWrite(client,'0xabc',status),/not confirmed successful/);
});
