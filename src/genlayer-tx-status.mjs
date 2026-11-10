// Interpret persisted GenLayer consensus status and GenVM execution separately.
// FINALIZED / FINISHED_WITH_ERROR is an unsuccessful contract execution.
export function summarizeStoredGenLayerTx(tx, expectedRecipient) {
  if (!tx || typeof tx !== 'object') throw Error('No stored transaction response');
  const status = String(tx.statusName || '').toUpperCase();
  const execution = String(tx.txExecutionResultName || '').toUpperCase();
  const recipient = String(tx.recipient || tx.to || '');
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
    return { status, execution, recipientMatch:false, result:'RECIPIENT_UNVERIFIED' };
  }
  const recipientMatch=recipient.toLowerCase()===String(expectedRecipient).toLowerCase();
  if(!recipientMatch) return {status,execution,recipientMatch,result:'WRONG_CONTRACT'};
  if (status==='FINALIZED' && execution==='FINISHED_WITH_RETURN') {
    return {status,execution,recipientMatch,result:'FINALIZED_SUCCESS_CHECK_CASE_STATE'};
  }
  if (status==='FINALIZED' && execution==='FINISHED_WITH_ERROR') {
    return {status,execution,recipientMatch,result:'FINALIZED_EXECUTION_ERROR'};
  }
  if (status==='CANCELED' || status==='CANCELLED') {
    return {status,execution,recipientMatch,result:'CANCELED'};
  }
  if (status==='FINALIZED') return {status,execution,recipientMatch,result:'FINALIZED_NOT_PROVEN_SUCCESS'};
  return {status,execution,recipientMatch,result:'NOT_FINALIZED_DO_NOT_RETRY'};
}
