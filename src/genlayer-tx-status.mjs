// Hosted Studionet genlayer-js@1.1.8 reports execution outcomes in the
// *leader receipt list* rather than txExecutionResultName. Do not interpret
// an Accepted consensus vote or FINALIZED status as successful GenVM execution.
export function provenGenVMExecutionName(tx) {
  const named=String(tx?.txExecutionResultName || '').toUpperCase().replace(/[^A-Z]/g,'');
  if(named==='FINISHEDWITHRETURN') return 'FINISHED_WITH_RETURN';
  if(named==='FINISHEDWITHERROR') return 'FINISHED_WITH_ERROR';
  const code=typeof tx?.txExecutionResult==='bigint' ? Number(tx.txExecutionResult)
    : Number.isInteger(tx?.txExecutionResult) ? tx.txExecutionResult : null;
  if(code===1) return 'FINISHED_WITH_RETURN';
  if(code===2) return 'FINISHED_WITH_ERROR';
  const entries=tx?.consensus_data?.leader_receipt;
  if(!Array.isArray(entries) || entries.length===0 || !entries.every(x=>x && typeof x==='object')) return '';
  const outcomes=entries.map(x=>String(x.execution_result || '').toUpperCase());
  if(outcomes.every(x=>x==='SUCCESS')) return 'FINISHED_WITH_RETURN';
  if(outcomes.every(x=>x==='ERROR')) return 'FINISHED_WITH_ERROR';
  return '';
}

// Interpret persisted GenLayer consensus status and GenVM execution separately.
// FINALIZED / FINISHED_WITH_ERROR is an unsuccessful contract execution.
export function summarizeStoredGenLayerTx(tx, expectedRecipient) {
  if (!tx || typeof tx !== 'object') throw Error('No stored transaction response');
  const status = String(tx.statusName || '').toUpperCase();
  const rawCode=tx?.txExecutionResult;
  const executionCode=typeof rawCode==='number' && Number.isInteger(rawCode) ? rawCode
    : typeof rawCode==='bigint' ? Number(rawCode) : null;
  const execution=provenGenVMExecutionName(tx);
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
