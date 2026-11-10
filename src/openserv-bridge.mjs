// Pure, SDK-independent partner bridge invariants. The only accepted authority
// for a verdict is finalized GenLayer contract state, never caller-supplied text.
import { createHash } from 'node:crypto';

const VERDICTS = new Set(['ACCEPT', 'REWORK', 'UNVERIFIABLE']);
function requireId(value, name) {
  if (!['string', 'number'].includes(typeof value) || !String(value).trim()) {
    throw new Error(`OpenServ ${name} is required`);
  }
  return String(value).trim();
}

export function caseIdForTask(workspaceId, taskId) {
  const workspace = requireId(workspaceId, 'workspace ID');
  const task = requireId(taskId, 'task ID');
  const digest = createHash('sha256').update(JSON.stringify([workspace, task])).digest('hex').slice(0, 24);
  return `sj_${digest}`;
}

// SDK action.task.id/workspace.id may be update-capability tokens rather
// than public database IDs. Never reveal or store them verbatim on-chain.
export function publicTaskRef(workspaceId, taskId) {
  const workspace = requireId(workspaceId, 'workspace ID');
  const task = requireId(taskId, 'task ID');
  const digest = createHash('sha256')
    .update('SERVJURY_PRIVATE_OPEN_SERV_CONTEXT_V1\\n')
    .update(JSON.stringify([workspace, task])).digest('hex').slice(0, 32);
  return `os_${digest}`;
}

export function isUnknownCaseError(error) {
  // Only a contract-level NOT_FOUND response allows first filing. RPC errors,
  // timeouts, invalid addresses, and malformed replies must fail closed.
  const message = String(error?.message || error);
  return /\bunknown case\b/i.test(message);
}

export function verifyStoredCase(state, expected) {
  if (!state || typeof state !== 'object') throw new Error('Invalid on-chain case readback');
  for (const key of ['task_id', 'terms', 'delivery', 'evidence']) {
    const value = key === 'task_id' ? expected.taskId : expected[key];
    if (state[key] !== value) throw new Error(`Existing case mismatch: ${key}. Refusing to adjudicate or log.`);
  }
  if (!['FILED', 'DECIDED'].includes(state.status)) throw new Error(`Invalid on-chain case status: ${state.status}`);
  return state;
}

export function verifiedReceipt(state, { caseId, taskId, filingTxHash = null, adjudicationTxHash = null }) {
  if (state.status !== 'DECIDED' || !VERDICTS.has(state.verdict)) {
    throw new Error('No finalized, valid contract verdict to report to OpenServ');
  }
  if (typeof state.reason !== 'string' || !state.reason.trim()) {
    throw new Error('Missing on-chain verdict reasoning');
  }
  const digest = createHash('sha256').update(JSON.stringify([caseId, taskId, state.verdict, state.reason])).digest('hex').slice(0, 16);
  return {
    receiptId: `servjury-${digest}`, caseId, taskId,
    verdict: state.verdict, reason: state.reason,
    filingTxHash,
    adjudicationTxHash,
    source: 'GenLayer finalized on-chain state',
  };
}

export async function runTaskReview({ workspaceId, taskId, input, allowFirstFiling = false, readCase, fileCase, judgeCase }) {
  const caseId = caseIdForTask(workspaceId, taskId);
  const publicTaskId = publicTaskRef(workspaceId, taskId);
  const expected = { taskId: publicTaskId, terms: input.terms, delivery: input.delivery, evidence: input.evidence };
  const publicInput = { ...input, taskId: publicTaskId };
  let state;
  let filingTxHash = null;
  try {
    state = await readCase(caseId);
  } catch (error) {
    if (!isUnknownCaseError(error)) throw error;
    if (!allowFirstFiling) {
      throw new Error(`On-chain case ${caseId} is missing. Enable ALLOW_FIRST_FILING=1 only for the initial reviewed task.`);
    }
    // Never resend when a tx hash was returned but finality timed out.
    // The caller must inspect that transaction and use the same case ID.
    const filing = await fileCase(caseId, publicInput);
    filingTxHash = filing?.txHash || null;
    state = await readCase(caseId);
  }
  verifyStoredCase(state, expected);
  let adjudicationTxHash = null;
  if (state.status === 'FILED') {
    const result = await judgeCase(caseId);
    adjudicationTxHash = result.txHash || null;
    state = await readCase(caseId);
    verifyStoredCase(state, expected);
  }
  return verifiedReceipt(state, { caseId, taskId: publicTaskId, filingTxHash, adjudicationTxHash });
}
