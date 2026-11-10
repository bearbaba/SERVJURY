// Account-level OpenServ API key check. This deliberately does NOT fall back
// to wallet/SIWE authentication: the platform /auth/wallet/nonce endpoint
// returned HTTP 404 on 2026-11-10. A GenLayer signing key is NOT an OpenServ
// account credential. Never print, store in Git, or send the key to a chat.
export function requireOpenServUserApiKey(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      'Missing OPENSERV_USER_API_KEY. Use an OpenServ PLATFORM USER API key ' +
      '(not the agent OPENSERV_API_KEY). Set it as a Codespaces secret, restart ' +
      'Codespace, then run npm run agent. The wallet nonce login path is unavailable.'
    );
  }
  if (/\s/.test(value)) {
    throw new Error('OPENSERV_USER_API_KEY has whitespace; check the secret value privately.');
  }
  return value;
}

export function explainPlatformAuthError(error) {
  const status = Number(error?.response?.status);
  if (status === 401 || status === 403) {
    return `OpenServ platform rejected the user API key (HTTP ${status}). Verify account-level key and permissions.`;
  }
  if (status === 404) {
    return 'OpenServ platform API returned HTTP 404. The API endpoint may have changed; do not switch to wallet nonce blindly.';
  }
  if (Number.isFinite(status) && status >= 100) {
    return `OpenServ platform connection failed with HTTP ${status}. No agent or task has been confirmed.`;
  }
  return 'OpenServ platform request failed before authenticated provisioning. Check network and API availability; no task was sent.';
}
