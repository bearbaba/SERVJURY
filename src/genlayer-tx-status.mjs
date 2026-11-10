// Interpret persisted GenLayer consensus status and GenVM execution separately.
// FINALIZED / FINISHED_WITH_ERROR is an unsuccessful contract execution.
export function summarizeStoredGenLayerTx(tx, expectedRecipient) {
  if (!tx || typeof tx !== 'object') throw Error('No stored transaction response');
  const status = String(tx.statusName || '').toUpperCase();
  // The stable SDK may omit the symbolic execution name while retaining the
  // contract ABI numeric code: 1 = finished with return, 2 = finished with
  // error. Never confuse tx.result (consensus vote) with execution.
  const executionCode = typeof tx.txExecutionResult==='number'
    ? tx.txExecutionResult
    : typeof tx.txExecutionResult==='bigint' ? Number(tx.txExecutionResult)
    : typeof tx.txExecutionResult==='string' && /^[0-5]$/.test(tx.txExecutionResult)
      ? Number(tx.txExecutionResult) : null;
  const named=String(tx.txExecutionResultName || '').toUpperCase().replace(/[^A-Z]/g,'');
  const execution = named==='FINISHEDWITHRETURN' ? 'FINISHED_WITH_RETURN'
    : named==='FINISHEDWITHERROR' ? 'FINISHED_WITH_ERROR'
    : executionCode===1 ? 'FINISHED_WITH_RETURN'
    : executionCode===2 ? 'FINISHED_WITH_ERROR'
    : named || '';
  const detail={status,execution,executionCode};
  const recipient = String(tx.recipient || tx.to || '');
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
    return { ...detail, recipientMatch:false, result:'RECIPIENT_UNVERIFIED' };
  }
  const recipientMatch=recipient.toLowerCase()===String(expectedRecipient).toLowerCase();
  if(!recipientMatch) return {...detail,recipientMatch,result:'WRONG_CONTRACT'};
  if (status==='FINALIZED' && execution==='FINISHED_WITH_RETURN') {
    return {...detail,recipientMatch,result:'FINALIZED_SUCCESS_CHECK_CASE_STATE'};
  }
  if (status==='FINALIZED' && execution==='FINISHED_WITH_ERROR') {
    return {...detail,recipientMatch,result:'FINALIZED_EXECUTION_ERROR'};
  }
  if (status==='CANCELED' || status==='CANCELLED') {
    return {...detail,recipientMatch,result:'CANCELED'};
  }
  if (status==='FINALIZED') return {...detail,recipientMatch,result:'FINALIZED_NOT_PROVEN_SUCCESS'};
  return {...detail,recipientMatch,result:'NOT_FINALIZED_DO_NOT_RETRY'};
}
