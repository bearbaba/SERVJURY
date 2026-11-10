# OpenServ provisioning 404 — verified diagnosis and safe recovery

**Observed in operator's Codespaces:** `npm run agent` attempted `POST https://api.openserv.ai/auth/wallet/nonce` and received **HTTP 404** on 2026-11-10. Response body: `Cannot POST /auth/wallet/nonce`. No OpenServ `agentId` or `workflowId` was shown, and no authenticated OpenServ task was created in this run.

## Why it failed

The OpenServ SDK `@openserv-labs/client` `provision()` function falls back to creating/reusing an **OpenServ wallet identity** when not provided with a platform user-level API key. It then calls `PlatformClient.authenticate()`, whose SIWE login flow requests the unavailable `/auth/wallet/nonce` route.

**`GENLAYER_PRIVATE_KEY` is NOT an OpenServ login key.** It only signs the GenLayer testnet contract calls. Adding it to `WALLET_PRIVATE_KEY` would not repair a nonexistent server endpoint, and would unnecessarily reuse your chain signing key.

Official client source: [provision.ts](https://github.com/openserv-labs/client/blob/main/src/provision.ts), [client.ts](https://github.com/openserv-labs/client/blob/main/src/client.ts). The supported `provision({ userApiKey })` configuration skips wallet SIWE entirely.

## Recovery using your OpenServ account

1. Sign into your own **[OpenServ platform](https://platform.openserv.ai/)** account and locate its **user/platform API key**. This is **not** an individual agent's `OPENSERV_API_KEY`. The official client README says an existing `userApiKey` from a previous `.openserv.json` can be reused, or one can be obtained in the platform dashboard. Do not paste the key into chat, GitHub code, screenshots or public logs.
2. In **GitHub → Settings → Codespaces → Secrets**, create a user secret named **`OPENSERV_USER_API_KEY`** and authorize repository `bearbaba/SERVJURY`. This is a second secret, separate from your `GENLAYER_PRIVATE_KEY`.
3. Stop and restart the existing Codespace `shiny bassoon`. No repo download or contract redeploy is required.
4. In the Codespaces terminal, sync **only tracked source changes** from GitHub:

   ```bash
   git status --short
   git pull --ff-only
   npm install
   ```

   If Git reports a local conflict, **do not discard `.env`, `.openserv.json`, `package-lock.json` or other changes blindly**. The tracked file may need reconciliation.

5. Check that the new secret **exists**, without revealing it:

   ```bash
   node -e 'console.log(process.env.OPENSERV_USER_API_KEY ? "OPENSERV USER KEY: SET" : "OPENSERV USER KEY: NOT SET")'
   ```

6. Run `npm run agent`. The patched agent first checks the platform API key via a read-only `agents.list()` call and then calls `provision({ userApiKey, agent, workflow })`. It **never falls back** to the broken wallet nonce route. It logs only IDs, not API keys or trigger URLs.

## Outcomes

- `Missing OPENSERV_USER_API_KEY`: user secret not configured; do **not** retry with a GenLayer wallet key.
- `HTTP 401/403`: the platform rejected the user API key (check key type/account/permissions).
- `HTTP 404` from `agents.list()`: a **separate platform API compatibility issue remains**, not solved by retrying wallet nonce. Record the status and contact OpenServ developer support if the current dashboard/API have changed.
- `SERVJURY OpenServ provisioned: agentId=... workflowId=...`: registration completed. Keep the terminal running and verify the tunnel before executing one task.
- Never run `npm run task:openserv -- --execute` before registration and a valid webhook are confirmed.

**No live OpenServ acceptance claim:** The current repository changes are an account-key recovery path, tested in isolated code and CI. An actual authenticated OpenServ provisioning call is still required.
