# SERVJURY — E2E V2 after confirmed file_case confirmation failure

## Verified cause of Task 750592 stopping

The original E2E V1 Agent terminal showed:

```text
GenLayer RPC error (gen_call): execution failed
GenLayer RPC error (gen_call): execution failed
SERVJURY GenLayer file_case: transaction receipt not confirmed; inspect tx=0x66de388fd40a96bbd07d625befacfda98a002907a5656f5075e6e781c88274c6 before any retry.
SERVJURY review not finalized; no verified verdict written to task log.
```

The public GenLayer Studionet history independently confirms that exact `file_case` TX **FINALIZED**, GenVM receipts **SUCCESS/SUCCESS**. Its related case `sj_bee8c5dbfb0aa4805ba169db` remained **FILED**, with no matching `adjudicate_case` found in the ten transactions queried. Thus **the V1 Agent stopped at filing-confirmation and never delivered a verified adjudication to OpenServ**. The two `gen_call` failures in the terminal are not enough to name their exact target (they may be earlier missing-case reads). A missing reliable receipt response is the supported cause of the stop. We still cannot prove which SDK wait exception or RPC timing produced it.

As of main commit `8539a1ed`, `confirmFinalizedWrite()` handles a thrown `waitForTransactionReceipt()` by independently reading **the same submitted hash** with `getTransaction()`. It requires FINALIZED and unanimous successful legacy GenVM receipts. This change has tests but **cannot retroactively complete V1**.

## Frozen historical evidence

- Legacy workflow **14061** / task **750591**: GenLayer DECIDED/REWORK; OpenServ task-log receipt visible; OpenServ Human Assistance failed.
- E2E V1 workflow **14062** / agent **4954** / task **750592**: OpenServ displayed DONE, but related GenLayer case stayed FILED, with only a successful `file_case` transaction confirmed. Do not call it a successful jury review.
- Neither historical task should be restarted, re-synced, retriggered, or manually adjudicated solely to improve a demo.
- SDK old workflow profiles are now explicitly frozen from new agent starts or webhook triggers. Keep local `.openserv.json`, prior one-shot markers and private credentials intact.

## E2E V2 — isolated, one-shot clean acceptance

The source adds profile `e2e-v2` with new names `SERVJURY — E2E Acceptance V2` (agent) and `SERVJURY E2E Acceptance V2` (workflow). It does **not** create them automatically on GitHub. The new task has a nonempty input/body with instructions that `NOT_VERIFIED` must never be called a successful verdict (the OpenServ output reviewer may still act independently; do not trust its score).

**Only proceed with a dedicated funded Studionet test wallet, intact credentials, and operator consent to one new OpenServ workflow and up to two new testnet transactions.** Stop an older Agent's terminal process via Ctrl+C; this stops the tunnel but does not mutate existing server tasks.

1. Update the existing Codespace:

   ```bash
   cd /workspaces/SERVJURY
   git pull --ff-only
   npm run check
   ```

2. Terminal A — provision and start **V2 only**, without touching V1:

   ```bash
   SERVJURY_AGENT_PROFILE=e2e-v2 SERVJURY_ALLOW_INITIAL_PROVISION=1 SERVJURY_COMPLETE_VERIFIED_TASK=1 ALLOW_FIRST_FILING=1 npm run agent
   ```

   Check the printed new `agentId` and `workflowId` are different from **4953, 4954** and **14061, 14062**. Confirm `Tunnel connected`. Do not post `.env`, `.openserv.json` or webhook tokens.

3. Terminal B — authenticated **read-only** preflight:

   ```bash
   SERVJURY_AGENT_PROFILE=e2e-v2 SERVJURY_COMPLETE_VERIFIED_TASK=1 npm run e2e:preflight
   ```

   Proceed only when it prints `E2E_PREFLIGHT_OK` with `inputPresent:true`, `bodyPresent:true`, known runnable status, and the new agent/workflow IDs. If not, stop; do not reuse V1.

4. Terminal B — operator-authorized *single* new workflow execution:

   ```bash
   SERVJURY_AGENT_PROFILE=e2e-v2 SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK npm run task:openserv -- --execute
   ```

   One-shot marker `.servjury-e2e-trigger-attempt-<newWorkflowId>.lock` prevents accidental repeat. If the CLI times out or returns an error, do not delete the marker or rerun.

5. Get the **new** task ID from OpenServ Run Mode after the webhook. Perform read-only verification using the returned IDs:

   ```bash
   OPENSERV_WORKFLOW_ID=<NEW_WORKFLOW_ID> OPENSERV_TASK_ID=<NEW_TASK_ID> OPENSERV_AGENT_ID=<NEW_AGENT_ID> npm run e2e:audit
   OPENSERV_WORKFLOW_ID=<NEW_WORKFLOW_ID> OPENSERV_TASK_ID=<NEW_TASK_ID> npm run tx:history
   ```

   The first command checks task/status/output against contract; the second scans GenLayer history for exactly that new case. Missing TXs or unexpected data are a **stop**, not a retry authorization.

### Pass condition before filming

- One new authenticated OpenServ task and one matching new GenLayer case.
- Signed `file_case` and `adjudicate_case` hashes both show **FINALIZED / successful GenVM execution** with no conflicting receipts.
- `get_case` shows `DECIDED`, valid verdict, nonempty reason and matching original evidence.
- OpenServ original task log shows matching `receiptId` and verdict; task `done` with output matching the chain-backed receipt, **not merely 9/10 Output Reviewer**.
- Run Mode session Completed with no Human Assistance or unexpected-error state.

A failed test does not mean another signed retry is safe. Preserve hashes and timestamps and inspect existing task/chain readbacks first.

## Important caveat

The patched readback uses a *single* read after a failed SDK wait; if GenLayer has not reached finality by then, SERVJURY still stops, **deliberately**. This run does not provide an automatic signed replay mechanism. It is a new isolated trial, not an assertion that the original issue cannot recur.

[Detailed E2E V1 incident](E2E_TASK_750592_DIAGNOSIS.md) · [Original GenLayer evidence](LIVE_STUDIONET_CASE_750591.md)
