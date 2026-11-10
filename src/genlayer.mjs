// Live GenLayer adapter. Imported only for explicitly enabled signing.
// Never confuse transaction consensus Accepted with GenVM successful return.
const allowed = new Set(['localnet', 'studionet', 'testnetBradbury']);

export function isFinalizedSuccess(receipt) {
  // Fail closed. SDK npm 'latest' does not currently expose the documented
  // isSuccessful named export, so verify the two fields directly.
  const status = String(receipt?.statusName || '').toUpperCase();
  const execution = String(receipt?.txExecutionResultName || '').toUpperCase();
  return status === 'FINALIZED' && execution === 'FINISHED_WITH_RETURN';
}

export async function makeClient() {
  const name = process.env.GENLAYER_NETWORK;
  if (!name || !allowed.has(name)) throw new Error(`Set a supported GENLAYER_NETWORK explicitly: ${name || '(empty)'}`);
  const addr = process.env.GENLAYER_CONTRACT_ADDRESS;
  const key = process.env.GENLAYER_PRIVATE_KEY;
  if (!/^0x[\da-fA-F]{40}$/.test(addr || '')) throw new Error('Invalid GENLAYER_CONTRACT_ADDRESS');
  if (!/^0x[\da-fA-F]{64}$/.test(key || '')) throw new Error('Invalid GENLAYER_PRIVATE_KEY');
  const [sdk, chains] = await Promise.all([import('genlayer-js'), import('genlayer-js/chains')]);
  if (!chains[name]) throw new Error(`Installed GenLayer SDK lacks chain definition: ${name}`);
  if (typeof sdk.createClient !== 'function' || typeof sdk.createAccount !== 'function') throw new Error('Incompatible GenLayer SDK exports');
  const client = sdk.createClient({ chain: chains[name], account: sdk.createAccount(key) });
  return { client, addr };
}
async function write(client, addr, functionName, args) {
  const call = { address: addr, functionName, args };
  if (typeof client.estimateTransactionFeesForWrite !== 'function') {
    throw new Error('Installed genlayer-js lacks estimateTransactionFeesForWrite; install a compatible SDK before enabling signed writes');
  }
  const estimate = await client.estimateTransactionFeesForWrite(call);
  const txHash = await client.writeContract({ ...call, fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } });
  try {
    const receipt = await client.waitForFinalization({ hash: txHash });
    if (!isFinalizedSuccess(receipt)) {
      const error = new Error(`GenLayer write not confirmed successful: ${receipt?.statusName || 'UNKNOWN'} / ${receipt?.txExecutionResultName || 'UNKNOWN'}`);
      error.txHash = txHash;
      throw error;
    }
    return { txHash, finalized: true, execution: 'SUCCESS' };
  } catch (error) {
    error.txHash = txHash;
    throw error;
  }
}
export async function fileLiveCase(caseId, data) {
  const { client, addr } = await makeClient();
  return write(client, addr, 'file_case', [caseId, data.taskId, data.terms, data.delivery, data.evidence]);
}
export async function judgeLiveCase(caseId) {
  const { client, addr } = await makeClient();
  const result = await write(client, addr, 'adjudicate_case', [caseId]);
  const state = await client.readContract({ address: addr, functionName: 'get_case', args: [caseId] });
  return { ...result, case: typeof state === 'string' ? JSON.parse(state) : state };
}
export async function readLiveCase(caseId) {
  const { client, addr } = await makeClient();
  const state = await client.readContract({ address: addr, functionName: 'get_case', args: [caseId] });
  return typeof state === 'string' ? JSON.parse(state) : state;
}
