# SERVJURY — Run a genuine OpenServ task (browser-first)

**State at 10 Nov 2026:** GenLayer contract `0x7040Db57D130C9c121Ad7152143b5076abB3c2B5` has three observed finalized, persisted Studio judgments. This run card starts a **new, authenticated OpenServ task** and is **not proof the OpenServ side has already executed**.

The shortest path without downloading to a Windows PC is **GitHub Codespaces** (browser-based developer environment). Codespaces may consume your GitHub allowance or incur charges. Do not use an existing production or high-value wallet.

## 1. Start a cloud dev session in your browser

1. Open [SERVJURY](https://github.com/bearbaba/SERVJURY).
2. Select **Code → Codespaces → Create codespace on main**.
3. Open terminal in the Codespace and run:

```bash
node -v
npm install
npm run task:openserv
```

The task command is a **dry run**: no network request, no wallet signature and no fees.

## 2. Configure a dedicated GenLayer **testnet** signer privately

Make a private config copied from the template:

```bash
cp .env.example .env
```

In the Codespaces editor, set these variables in the untracked `.env` file:

```dotenv
ENABLE_LIVE_TRANSACTIONS=1
GENLAYER_NETWORK=studionet
GENLAYER_CONTRACT_ADDRESS=0x7040Db57D130C9c121Ad7152143b5076abB3c2B5
GENLAYER_PRIVATE_KEY=<ONLY A DEDICATED GENLAYER TESTNET KEY>
ALLOW_FIRST_FILING=1
```

**Do not send any secret to ChatGPT.** The test private key is necessary because the autonomous OpenServ capability signs `file_case` and `adjudicate_case`. You may choose to create a fresh, expendable wallet and fund it using the network's supported test-token mechanism. Do not export your main wallet's key.

**OpenServ account API key now required:** OpenServ's wallet-nonce sign-in returned HTTP 404 on 10 November 2026. Use a distinct **platform user API key** named `OPENSERV_USER_API_KEY`, configured as a GitHub Codespaces Secret. Authorize `bearbaba/SERVJURY`, then restart the Codespace. This is not `GENLAYER_PRIVATE_KEY` or the per-agent `OPENSERV_API_KEY`. The patched `provision({ userApiKey })` path skips wallet-nonce authentication. See the [404 recovery runbook](OPENSERV_AUTH_404.md).

## 3. Launch an authenticated OpenServ agent

Once your user API key secret is loaded, update source safely from the repo, then start the agent:

```bash
git pull --ff-only
npm install
node -e 'console.log(process.env.OPENSERV_USER_API_KEY ? "OPENSERV USER KEY: SET" : "OPENSERV USER KEY: NOT SET")'
```

If `NOT SET`, do not start the agent; add the Codespaces secret and restart. In Codespaces terminal A:

```bash
npm run agent
```

This calls OpenServ `provision({userApiKey, agent:{instance:agent}, workflow:...})` and starts the tunnel with `run(agent)`. The webhook token is not printed or saved to a standalone URL file. Keep the terminal alive and the Codespace running.

**Do not show or post the contents of** `.env`, `.openserv.json`, or any webhook token. The script only prints the nonsecret `agentId` and `workflowId`.

If provisioning or the tunnel fails, do not trigger the workflow yet. Resolve the authenticated OpenServ connection first.

## 4. Fire exactly one real task

In a **second** Codespaces terminal, run:

```bash
SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK npm run task:openserv -- --execute
```

The script uses `OPENSERV_USER_API_KEY` from the environment and resolves the registered workflow from `.openserv.json` (or `OPENSERV_WORKFLOW_ID`). It calls official `client.triggers.fireWebhook({workflowId,...})` without exposing the token. It submits a fictional invoice with a deliberately incorrect subtotal, **without stating the correct answer in the evidence**. Because the webhook uses `waitForCompletion: true`, the call may remain pending while OpenServ and GenLayer execute; do not submit it twice if the command times out.

The OpenServ platform must issue the real workspace/task IDs. The GenLayer contract must then file the case under the task ID and record the AI verdict. `ACCEPT`, `REWORK`, or `UNVERIFIABLE` are possible; no verdict is guaranteed by this guide.

## 5. Acceptance evidence — required before any completion claim

- OpenServ: record the **actual** agent/workflow/task IDs and workspace, plus a screenshot or URL of the task activity.
- GenLayer: capture the **new** `file_case` and `adjudicate_case` hashes; both must show **FINALIZED** and a successful GenVM return.
- Contract: `get_case(caseId)` must show `DECIDED`, a recognized verdict, a nonempty reason, and `task_id` matching the authenticated OpenServ task.
- OpenServ: the same task's log must include the on-chain verdict, `receiptId`, `caseId`, and reason written through `addLogToTask`.

If any step fails, record the last observed state and stop. Do not blindly rerun signed operations. The bridge compares immutable terms/delivery/evidence and prevents adjudicating a mismatched existing case, but OpenServ may append a duplicate task log on a replay.

## Alternative — trigger without a local download

Once your OpenServ agent is already running and its API key is configured, you can use the manual [**Run one real OpenServ demo task** GitHub Action](https://github.com/bearbaba/SERVJURY/actions/workflows/run-openserv-task.yml). Set the OpenServ **platform user API key** as the repository's encrypted **Actions secret** named `OPENSERV_USER_API_KEY` (Codespaces Secrets are separate). The Action takes the nonsecret workflow ID and requires typing `RUN_ONE_TEST_TASK`; never put an API key or webhook token in workflow inputs.

**This remote Action only triggers a **new** task in an existing OpenServ workflow. It does not host, provision, or keep the agent running.** Use Codespaces or a secured private runtime for the agent.

See [full partner acceptance](OPENSERV_LIVE_ACCEPTANCE.md) and [on-chain evidence](ONCHAIN_EVIDENCE.md). Do not claim authenticated OpenServ completion from the earlier synthetic Studio cases.

## 6. First authenticated task and GenLayer missing-case fix

An actual OpenServ task was triggered on 2026-11-10 (agent 4953, workflow 14061), but Studionet `get_case` on a new case returned a generic `gen_call` execution failure. That attempt did not produce verified filing, judgment or task-log evidence. **Do not trigger another task before inspecting the existing task status.** Run `npm run task:inspect` after updating to the patched source, then see [the first task recovery notes](FIRST_AUTHENTICATED_OPENSERV_TASK.md). The patch uses two read-only on-chain controls before any first filing and forbids LLM-edited evidence.
