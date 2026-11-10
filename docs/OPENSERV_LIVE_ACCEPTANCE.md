# SERVJURY — OpenServ partner integration acceptance (10 November 2026)

**Purpose:** close the demonstrable partner loop: **real OpenServ task → GenLayer filing and AI judgment → finalized on-chain readback → OpenServ task log**.

This guide is for an authorized operator of the OpenServ account and a **dedicated GenLayer Studionet test wallet**. The three [Studio on-chain fixtures](ONCHAIN_EVIDENCE.md) are already recorded, but none of them is a genuine OpenServ task.

## Verified foundations

- On-chain GenLayer Studionet contract: [`0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`](https://explorer-studio.genlayer.com/address/0x7040Db57D130C9c121Ad7152143b5076abB3c2B5) (Studionet 61999; NOT Studio-dev 61997)
- OpenServ capability: [`agent/openserv-agent.mjs`](../agent/openserv-agent.mjs) — `adjudicate_delivery` using official `Agent`, `provision`, `triggers.webhook`, and `addLogToTask` APIs
- GenLayer adapter: [`src/genlayer.mjs`](../src/genlayer.mjs), must wait for finalized successful writes
- Bridge guards: [`src/openserv-bridge.mjs`](../src/openserv-bridge.mjs), verifies the stored task and evidence match before returning a verdict
- Tests and CI: [GitHub Actions](https://github.com/bearbaba/SERVJURY/actions). Local tests do not replace a connected OpenServ acceptance test.

## Preflight — do not disclose credentials

1. In an OpenServ account, provision an agent/workflow authorized to access a testing workspace. Create a genuine task for the agent to review. Use an actual OpenServ-assigned workspace ID and task ID, **not** `openserv-demo-*` from the synthetic Studio fixtures.
2. Use a dedicated, funded **testnet-only** GenLayer signing wallet. Do **not** reuse your main wallet or share its private key in chat, source, logs or screenshots.
3. On an authorized execution environment (local computer or protected private service), create `.env` from [`.env.example`](../.env.example) and set:
   - `ENABLE_LIVE_TRANSACTIONS=1`
   - `GENLAYER_NETWORK=studionet`
   - `GENLAYER_CONTRACT_ADDRESS=0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`
   - `GENLAYER_PRIVATE_KEY=` **dedicated test signer**, stored privately
   - `ALLOW_FIRST_FILING=1` **only during the reviewed first task** (disable after)
4. Confirm account and funding on Studionet chain ID `61999`, NOT `61997`.
5. Do not enable live signing on a public web server. The public demo can stay fixture-only; the OpenServ agent is a separate authorized process.

## Start the partner agent

From the repository root with Node.js >=22:

```sh
npm install
# In Windows Git Bash:
set -a; source .env; set +a
npm run agent
```

`provision()` registers the `SERVJURY Delivery Review` webhook workflow. The SDK tunnel attaches the agent to the platform using the returned agent API key. Never share the API key, private key or the raw `.openserv.json`.

The OpenServ workflow requests three strings: `terms`, `delivery`, and `evidence`. A suggested **safe real task** is an invoice subtotal review using non-sensitive fictional invoice rows. The *task identity must come from OpenServ's authenticated `action.task.id` and `action.workspace.id`*; it is never accepted as a spoofable user-supplied argument.

## Required connected proof — record actual outputs

| Step | Real evidence to capture | Pass condition |
| --- | --- | --- |
| A. OpenServ task identity | OpenServ workspace/task URLs or IDs and agent invocation | Real task, not a `openserv-demo-*` fixture |
| B. `file_case` | Fresh GenLayer hash, FINALIZED + GenVM SUCCESS | Stored `task_id`, `terms`, `delivery`, `evidence` equal original OpenServ task |
| C. `adjudicate_case` | Distinct GenLayer hash, FINALIZED + GenVM SUCCESS | Real contract verdict `ACCEPT` / `REWORK` / `UNVERIFIABLE` |
| D. `get_case` | Raw readback for the derived `sj_...` case ID | `status: DECIDED`, same verdict and nonempty reason |
| E. `addLogToTask` | OpenServ task activity/log screenshot and task ID | Includes stable `receiptId`, `caseId`, actual `verdict`, `reason` and `source` |
| F. Negative checks | Repeat request with same task but different `evidence` | Bridge refuses mismatch, no second adjudication |
| G. Network safety | Simulate an RPC timeout before filing | No write attempted (covered by isolated tests; connected confirmation optional) |

**Do not claim OpenServ integration complete until step E has been observed.**

## Failure and retry policy

- If `get_case` fails with a network error, **stop**: the bridge must not issue `file_case`.
- First filing is permitted only when the contract explicitly reports `Unknown case` **and** `ALLOW_FIRST_FILING=1`.
- If any write submitted a transaction hash and then times out, inspect the **original hash** and check `get_case` before attempting another action. Never blindly resend a write.
- A decided case must not be adjudicated again. Reinvocation may append another OpenServ log record: `receiptId` is deterministic for manual deduplication, but the SDK alone does **not** guarantee exactly-once task-log delivery.
- Invalid verdicts, empty reasons, changed filed evidence or wrong task IDs block writeback.
- No escrow, token transfers, automatic payouts, refunds or legal rulings are involved.

## Media and submission

Once the OpenServ log is verified, use [`VIDEO_45S.md`](VIDEO_45S.md) to edit an under-45-second demo. Capture the actual linked OpenServ task, the finalized GenLayer verdict and the same OpenServ task log. The final edit must show three **official partner logos** (Internet Court, GenLayer and OpenServ). The current interface uses name treatments and is not evidence that official logo assets have been licensed or retrieved.

**Evidence status at time of writing:** GenLayer Studio three-case acceptance **complete**. Authenticated OpenServ-to-GenLayer-to-OpenServ demonstration **not yet performed** in this environment because platform credentials and a private signer are not available here.
