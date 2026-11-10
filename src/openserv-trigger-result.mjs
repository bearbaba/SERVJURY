// A webhook HTTP 2xx can still contain {status:'error', error:...}.
// Never equate transport success, or an object with 'status' keys, with an
// OpenServ completed workflow or a finalized GenLayer transaction.
// Do not print provider error bodies: they can contain auth/update tokens.
export function summarizeTriggerResult(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return { status:'UNKNOWN', result:'UNCONFIRMED', errorPresent:false };
  }
  const raw=typeof response.status==='string' ? response.status.trim().toLowerCase() : '';
  const allowed=new Set(['success','completed','succeeded','ok','pending','queued','running','in-progress','processing','accepted','error','failed','failure','timeout']);
  const status=allowed.has(raw) ? raw.toUpperCase() : 'UNKNOWN';
  const errorPresent=response.error !== undefined && response.error !== null && response.error !== false && response.error !== '';
  const result=errorPresent || ['ERROR','FAILED','FAILURE','TIMEOUT'].includes(status) ? 'ERROR'
    : ['SUCCESS','COMPLETED','SUCCEEDED','OK'].includes(status) ? 'ACKNOWLEDGED_NOT_VERIFIED'
    : ['PENDING','QUEUED','RUNNING','IN-PROGRESS','PROCESSING','ACCEPTED'].includes(status) ? 'PENDING'
    : 'UNCONFIRMED';
  return { status, result, errorPresent };
}
