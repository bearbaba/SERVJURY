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

If you already use an OpenServ platform account and want the agent under that identity, configure its OpenServ account credentials privately according to the official OpenServ client documentation. Without an existing identity, `provision()` may create a **new** account and wallet; preserve `.openserv.json` so future runs reuse the intended identity.

## 3. Launch an authenticated OpenServ agent

In Codespaces terminal A:

```bash
npm run agent
```

This calls OpenServ `provision({agent:{instance:agent}, workflow:...})`, starts the tunnel with `run(agent)`, and stores the webhook trigger URL in the local **gitignored** file `.openserv-trigger-url`. Keep the terminal alive and the Codespace running.

**Do not show or post the contents of** `.env`, `.openserv.json`, or `.openserv-trigger-url`. The script only prints the nonsecret `agentId` and `workflowId`.

If provisioning or the tunnel fails, do not trigger the workflow yet. Resolve the authenticated OpenServ connection first.

## 4. Fire exactly one real task

In a **second** Codespaces terminal, run:

```bash
SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK npm run task:openserv -- --execute
```

The script uses the stored private webhook URL and official `client.triggers.fireWebhook()`. It submits a fictional invoice with a deliberately incorrect subtotal, **without stating the correct answer in the evidence**. Because the webhook uses `waitForCompletion: true`, the call may remain pending while OpenServ and GenLayer execute; do not submit it twice if the command times out.

The OpenServ platform must issue the real workspace/task IDs. The GenLayer contract must then file the case under the task ID and record the AI verdict. `ACCEPT`, `REWORK`, or `UNVERIFIABLE` are possible; no verdict is guaranteed by this guide.

## 5. Acceptance evidence — required before any completion claim

- OpenServ: record the **actual** agent/workflow/task IDs and workspace, plus a screenshot or URL of the task activity.
- GenLayer: capture the **new** `file_case` and `adjudicate_case` hashes; both must show **FINALIZED** and a successful GenVM return.
- Contract: `get_case(caseId)` must show `DECIDED`, a recognized verdict, a nonempty reason, and `task_id` matching the authenticated OpenServ task.
- OpenServ: the same task's log must include the on-chain verdict, `receiptId`, `caseId`, and reason written through `addLogToTask`.

If any step fails, record the last observed state and stop. Do not blindly rerun signed operations. The bridge compares immutable terms/delivery/evidence and prevents adjudicating a mismatched existing case, but OpenServ may append a duplicate task log on a replay.

## Alternative — trigger without a local download

Once your OpenServ agent is already running and has a valid webhook URL, you can use the manual [**Run one real OpenServ demo task** GitHub Action](https://github.com/bearbaba/SERVJURY/actions/workflows/run-openserv-task.yml). Set the URL as the repository's encrypted **Actions secret** named `OPENSERV_WEBHOOK_URL`, not as a workflow input. The action requires typing `RUN_ONE_TEST_TASK`.

**This remote Action only triggers an existing OpenServ workflow. It does not host, provision, or keep the agent running.** Use Codespaces or a secured private runtime for the agent.

See [full partner acceptance](OPENSERV_LIVE_ACCEPTANCE.md) and [on-chain evidence](ONCHAIN_EVIDENCE.md). Do not claim authenticated OpenServ completion from the earlier synthetic Studio cases.
