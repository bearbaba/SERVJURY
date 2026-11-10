// The official OpenServ client logger includes webhook tokens in normal
// provisioning status lines. Log only human-safe, single-line redacted text.
export function redactProvisionMessage(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '[details redacted]';
  return String(value)
    .replace(/(token\s*:\s*)[^\s,)]+/gi, '$1[REDACTED]')
    .replace(/(api[_ -]?key\s*[:=]\s*)[^\s,)]+/gi, '$1[REDACTED]')
    .replace(/(private[_ -]?key\s*[:=]\s*)[^\s,)]+/gi, '$1[REDACTED]')
    .replace(/https?:\/\/[^\s]+\/webhooks\/trigger\/[^\s)]+/gi, '[WEBHOOK_URL_REDACTED]')
    .replace(/0x[a-f0-9]{64}/gi, '[PRIVATE_KEY_REDACTED]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 350);
}

export function safeProvisionLogger() {
  const write = (method, args) => {
    const fields = args.map(redactProvisionMessage);
    console[method]('[provision]', ...fields);
  };
  return {
    info: (...args) => write('log', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
  };
}
