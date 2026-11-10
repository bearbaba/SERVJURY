# Security dependency update — Zod 4.6.7 (2026-11-10)

## Observed issue

In a user-owned Codespaces install, `npm audit --omit=dev --audit-level=high` reported five **High** dependency findings. All referenced Zod advisory [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), affecting Zod <4.6.6, via transitive dependencies of `@openserv-labs/sdk` (including OpenAI SDK, Zod-to-OpenAPI, and JSON-schema-to-Zod).

## Tested mitigation

- Pin direct Zod dependency to `4.6.7`.
- Override transitive Zod resolution to the same patched version using npm overrides.
- Verify in isolated GitHub CI without any wallet keys, OpenServ API keys or authenticated task triggers:
  - `npm install --ignore-scripts`
  - `npm ls zod --all`
  - `npm audit --omit=dev --audit-level=high` (observed **0 vulnerabilities** for the patched test)
  - Offline `Agent` construction and `addCapability` with Zod schemas
  - JS/Python deterministic test suites
  - Read-only `get_case` on previously finalized GenLayer Studionet contract
- Production audit gate added to default CI for future dependencies.

## Compatibility caveat

Forcing the Zod 4 tree may not guarantee that every legacy SDK schema-to-OpenAPI or dynamic JSON schema conversion behaves correctly, especially with libraries designed for Zod 3. **The authenticated OpenServ agent provisioning and full task round trip remain unverified.** Keep the demo restricted to a dedicated, low-value GenLayer testnet signer and fictional tasks until those real acceptance checks pass.

Do not run `npm audit fix --force`; it can arbitrarily change pinned SDK versions. Never move `GENLAYER_PRIVATE_KEY`, `OPENSERV_USER_API_KEY`, session tokens or webhook URLs into code or GitHub commits.

## Operator instructions

After this patch is merged to `main`, stop any running OpenServ agent process. In Codespaces:

```bash
git status --short
git pull --ff-only
npm install
npm audit --omit=dev --audit-level=high
npm run check
```

A local untracked `package-lock.json` can preserve older dependencies and needs review; **do not blindly delete a lockfile that contains user's uncommitted work.** The `.env` file and private Codespaces secrets must remain untouched. If `git pull` reports an untracked lockfile collision, preserve its content and report the exact Git error.

Only run `npm run agent` after confirming the OpenServ user key is loaded and the audit/test gates pass. Registering OpenServ and firing the webhook are separate operations.
