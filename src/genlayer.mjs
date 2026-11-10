// Live GenLayer adapter. Imported only in explicit, configured LIVE mode.
// No private key leaves this server and no write is automatically retried.
const allowed = new Set(['localnet', 'studionet', 'testnetBradbury']);

export async function makeClient() {
  const name = process.env.GENLAYER_NETWORK || 'studionet';
  if (!allowed.has(name)) throw new Error(`Unsupported chain: ${name}`);
  const addr = process.env.GENLAYER_CONTRACT_ADDRESS;
  const key = process.env.GENLAYER_PRIVATE_KEY;
  if (!/^0x[\da-fA-F]{40}$/.test(addr || '')) throw new Error('Invalid GENLAYER_CONTRACT_ADDRESS');
  if (!/^0x[\da-fA-F]{64}$/.test(key || '')) throw new Error('Invalid GENLAYER_PRIVATE_KEY');
  const [{ createClient, createAccount, isSuccessful }, chains] = await Promise.all([
    import('genlayer-js'), import('genlayer-js/chains'),
  ]);
  const client = createClient({ chain: chains[name], account: createAccount(key) });
  return { client, addr, isSuccessful };
}
async function write(client, addr, isSuccessful, functionName, args) {
  const call = { address: addr, functionName, args };
  const estimate = await client.estimateTransactionFeesForWrite(call);
  // A returned hash means submission already occurred. Never re-issue blindly.
  const txHash = await client.writeContract({ ...call, fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } });
  try {
    const receipt = await client.waitForFinalization({ hash: txHash });
    if (!isSuccessful(receipt)) {
      const e = new Error('On-chain execution failed; inspect the original hash. No automatic retry.');
      e.txHash = txHash;
      throw e;
    }
    return { txHash, finalized: true, execution: 'SUCCESS' };
  } catch (error) {
    error.txHash = txHash;
    throw error;
  }
}
export async function fileLiveCase(caseId, data) {
  const { client, addr, isSuccessful } = await makeClient();
  return write(client, addr, isSuccessful, 'file_case', [caseId, data.taskId, data.terms, data.delivery, data.evidence]);
}
export async function judgeLiveCase(caseId) {
  const { client, addr, isSuccessful } = await makeClient();
  const result = await write(client, addr, isSuccessful, 'adjudicate_case', [caseId]);
  const state = await client.readContract({ address: addr, functionName: 'get_case', args: [caseId] });
  return { ...result, case: typeof state === 'string' ? JSON.parse(state) : state };
}
export async function readLiveCase(caseId) {
  const { client, addr } = await makeClient();
  const state = await client.readContract({ address: addr, functionName: 'get_case', args: [caseId] });
  return typeof state === 'string' ? JSON.parse(state) : state;
}
