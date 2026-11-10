// A deployed Studionet get_case(view) raises gl.vm.UserError("Unknown case")
// for absent case IDs. Hosted RPC v1 may erase that reason and return only
// viem InvalidInputRpcError / -32000 / "execution failed".
// An RPC transport failure alone NEVER authorizes a signed filing.
//
// Calibrate the target read failure against *the same method*, on the same
// deployed contract, using a known present reference case and a deliberately
// unfiled sentinel. Contract file_case itself independently rejects duplicates.
export const KNOWN_PRESENT_CASE = 'SJ-INV-20261110-A';
export const KNOWN_ABSENT_SENTINEL = 'sj__unfiled_rpc_probe_20261110_b4e2c6';

export function rpcExecutionFailureSignature(error) {
  let current = error;
  for (let depth = 0; current && depth < 5; depth++, current = current.cause) {
    const code = Number(current.code);
    const details = String(current.details || '').trim();
    const name = String(current.name || '');
    if (code === -32000 && name === 'InvalidInputRpcError' &&
        /^execution failed$/i.test(details)) {
      return 'InvalidInputRpcError:-32000:execution failed';
    }
  }
  return null;
}

export async function classifyMissingCaseWithCalibratedProbe({
  targetError, readKnownCase, readAbsentSentinel,
}) {
  const signature = rpcExecutionFailureSignature(targetError);
  if (!signature) throw targetError;
  // Positive control: the same contract's read is currently working.
  // A wrong chain, wrong contract, offline RPC, bad ABI or systemic gen_call
  // failure must never be interpreted as a new case.
  const known = await readKnownCase(KNOWN_PRESENT_CASE);
  if (!known || known.case_id !== KNOWN_PRESENT_CASE ||
      known.status !== 'DECIDED' || known.verdict !== 'ACCEPT') {
    throw new Error('GenLayer positive control failed; refusing first filing.');
  }
  let absentError = null;
  try {
    // Negative control must be genuinely absent; never create this sentinel.
    await readAbsentSentinel(KNOWN_ABSENT_SENTINEL);
  } catch (error) {
    absentError = error;
  }
  if (!absentError || rpcExecutionFailureSignature(absentError) !== signature) {
    throw new Error('GenLayer missing-case probe inconclusive; refusing first filing.');
  }
  const error = new Error('Unknown case (calibrated by existing and absent on-chain get_case controls)');
  error.code = 'GENLAYER_UNKNOWN_CASE_PROBED';
  error.cause = targetError;
  throw error;
}
