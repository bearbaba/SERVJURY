import { classifyMissingCaseWithCalibratedProbe } from './genlayer-missing.mjs';
import { provenGenVMExecutionName } from './genlayer-tx-status.mjs';
// Stable GenLayer Studionet SDK v1 adapter. This contract is on Studionet
// chain 61999 (NOT Studio-dev 61997). No signer key ever goes to the browser.
// Never blindly retry a write once a tx hash has been received.
const allowed = new Set(['localnet', 'studionet', 'testnetBradbury']);

export function isFinalizedSuccess(receipt) {
  const status = String(receipt?.statusName || '').toUpperCase();
  const execution = provenGenVMExecutionName(receipt);
  return status === 'FINALIZED' && execution === 'FINISHED_WITH_RETURN';
}

export async function makeClient() {
  const name = process.env.GENLAYER_NETWORK;
  if (!name || !allowed.has(name)) throw new Error(`Explicit supported GENLAYER_NETWORK required, got ${name || '(empty)'}`);
  const addr = process.env.GENLAYER_CONTRACT_ADDRESS;
  const key = process.env.GENLAYER_PRIVATE_KEY;
  if (!/^0x[\da-fA-F]{40}$/.test(addr || '')) throw new Error('Invalid GENLAYER_CONTRACT_ADDRESS');
  if (!/^0x[\da-fA-F]{64}$/.test(key || '')) throw new Error('Invalid GENLAYER_PRIVATE_KEY');
  const [sdk, chains, types] = await Promise.all([
    import('genlayer-js'), import('genlayer-js/chains'), import('genlayer-js/types'),
  ]);
  if (!chains[name]) throw new Error(`Installed GenLayer SDK lacks chain definition: ${name}`);
  if (name === 'studionet' && chains[name].id !== 61999) {
    throw new Error('The SDK Studionet preset is not chain 61999; refusing to sign');
  }
  const client = sdk.createClient({ chain: chains[name], account: sdk.createAccount(key) });
  if (typeof client.waitForTransactionReceipt !== 'function' || !types.TransactionStatus?.FINALIZED) {
    throw new Error('Incompatible GenLayer SDK: expected stable waitForTransactionReceipt/TransactionStatus');
  }
  return { client, addr, TransactionStatus: types.TransactionStatus };
}

// Explicitly request complete receipts: genlayer-js v1 defaults to the
// simplified format, which loses Studionet's leader GenVM execution result.
export async function confirmFinalizedWrite(client, txHash, TransactionStatus) {
  const receipt=await client.waitForTransactionReceipt({
    hash:txHash, status:TransactionStatus.FINALIZED, fullTransaction:true,
  });
  if(isFinalizedSuccess(receipt)) return receipt;
  const stored=await client.getTransaction({hash:txHash}); // read-only recovery
  if(isFinalizedSuccess(stored)) return stored;
  const error=new Error('Write finalized execution not confirmed successful by complete GenVM receipt');
  error.txHash=txHash;
  throw error;
}

async function write(client, addr, TransactionStatus, functionName, args) {
  const call = { address: addr, functionName, args, value: 0n };
  // Hosted stable Studionet currently uses the SDK v1 write lifecycle. Do not
  // pass the newer v2 fee estimate/simulation fields intended for Studio-dev.
  const txHash = await client.writeContract(call);
  try {
    await confirmFinalizedWrite(client, txHash, TransactionStatus);
    console.log(`SERVJURY GenLayer ${functionName}: FINALIZED / SUCCESS, tx=${txHash}`);
    return { txHash, finalized: true, execution: 'SUCCESS' };
  } catch (error) {
    console.error(`SERVJURY GenLayer ${functionName}: transaction receipt not confirmed; inspect tx=${txHash} before any retry.`);
    error.txHash = txHash;
    throw error;
  }
}

export async function fileLiveCase(caseId, data) {
  const { client, addr, TransactionStatus } = await makeClient();
  return write(client, addr, TransactionStatus, 'file_case', [caseId, data.taskId, data.terms, data.delivery, data.evidence]);
}
export async function judgeLiveCase(caseId) {
  const { client, addr, TransactionStatus } = await makeClient();
  const result = await write(client, addr, TransactionStatus, 'adjudicate_case', [caseId]);
  const state = await client.readContract({ address: addr, functionName: 'get_case', args: [caseId] });
  return { ...result, case: typeof state === 'string' ? JSON.parse(state) : state };
}
async function readCaseFromClient(client, addr, caseId) {
  const state = await client.readContract({ address: addr, functionName: 'get_case', args: [caseId] });
  return typeof state === 'string' ? JSON.parse(state) : state;
}

export async function readLiveCase(caseId) {
  const { client, addr } = await makeClient();
  try {
    return await readCaseFromClient(client, addr, caseId);
  } catch (targetError) {
    return classifyMissingCaseWithCalibratedProbe({
      targetError,
      readKnownCase: (referenceId) => readCaseFromClient(client, addr, referenceId),
      readAbsentSentinel: (sentinelId) => readCaseFromClient(client, addr, sentinelId),
    });
  }
}
