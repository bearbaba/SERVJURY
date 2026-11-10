// Public, read-only GenLayer Studio interoperability probe. No signing key.
// Nonessential external-network smoke test; leave live wallet disabled.
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const address = '0x7040Db57D130C9c121Ad7152143b5076abB3c2B5';
const caseId = 'SJ-INV-20261110-A';

if (studionet.id !== 61999) {
  throw new Error(`Studionet chain mismatch: ${studionet.id}`);
}
const client = createClient({
  chain: studionet,
  account: createAccount('0x' + '11'.repeat(32)), // Public dummy; never used to sign.
});
console.log('Probing read-only Studionet (61999) get_case against known finalized SERVJURY Case A…');
const value = await client.readContract({ address, functionName: 'get_case', args: [caseId] });
const caseData = typeof value === 'string' ? JSON.parse(value) : value;
if (caseData?.case_id !== caseId || caseData?.status !== 'DECIDED' || caseData?.verdict !== 'ACCEPT') {
  throw new Error('Unexpected Studio readback — no authorization to sign');
}
console.log('READ_OK: Studionet contract returned DECIDED / ACCEPT from public RPC.');
