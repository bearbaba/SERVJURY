# SERVJURY — E2E V2 Task 750593: interrupted webhook, successful filing, no adjudication proof

## Observed facts from the authorized operator

- Source profile: `e2e-v2` at OpenServ workflow **14063**, agent **4955**, task node **750593**.
- Preflight readback: `to-do`, nonempty `input`, `body`, `description`; PASS.
- Launcher printed `Isolated E2E workflow selected` and **did not print a webhook result** before the operator pressed `Ctrl+C`. A CLI interruption does **not** establish that the remote OpenServ session was canceled or fully completed. **No automatic reattempt is permitted.**
- Later read-only OpenServ task status: **`human-assistance-required`**; task output absent.
- Later GenLayer Studionet (chain 61999) persisted contract readback for `sj_652f6d1f9065b46711422f38`: **`FILED`**, no verdict.
- Public contract history: `file_case` TX **`0x0dff748ffba13d1f8a036e28cd6bc171d75528e42bdbe425daea013afdbdce6f`**, `FINALIZED`, two GenVM leader receipts **SUCCESS/SUCCESS**. No matching `adjudicate_case` appeared in the 11 returned contract transactions. A truncated/out-of-date history is not proof that a transaction never existed.

## Read-only SDK reproduction (GitHub Actions)

On the **same historical V2 filing hash**, a read-only GitHub Actions diagnostic with a dummy account returned:

```text
SAME_HASH_DIRECT_READ {"status":"FINALIZED","execution":"FINISHED_WITH_RETURN","confirmed":true}
SAME_HASH_SDK_WAITER {"kind":"RESOLVED","status":"FINALIZED","execution":"FINISHED_WITH_RETURN","confirmed":true}
```

**Interpretation:** The installed GenLayer SDK can confirm a previously finalized V2 transaction today. This does NOT establish whether the original webhook session's receipt waiter encountered an RPC error, temporary missing receipt, a timeout, or an unrelated task failure while the TX was still in flight. The exact active Agent terminal log for V2 is still needed to identify the original failing stage.

## Preventive improvement (does not retroactively fix Task 750593)

After an initial receipt-wait failure, `confirmFinalizedWrite()` checks the SAME already submitted hash via `getTransaction()` using a finite backoff of 6 read attempts. It accepts only FINALIZED with verifiable GenVM SUCCESS. A definitive GenVM error fails closed. An RPC outage, incomplete receipt, or pending TX after the read budget remains unverified and preserves its original TX hash for manual inspection. **No new write, re-sign, or webhook retry is performed during this recovery.**

## Freeze original execution and inspect only

Do not repeat `task:openserv -- --execute` for workflow 14063 or delete its `.servjury-e2e-trigger-attempt-14063.lock`. Do not click **Restart Task**, force a workflow sync, or directly call `adjudicate_case` solely for a demo. A new Agent cannot be safely attached to an existing Human Assistance task without explicit signed provenance and case-state reconciliation. In the repository, V1 and V2 profiles are both frozen from launch.

To inspect current status without a write (existing Codespaces, private API key still needed for OpenServ):

```bash
OPENSERV_WORKFLOW_ID=14063 OPENSERV_TASK_ID=750593 OPENSERV_AGENT_ID=4955 npm run e2e:audit
OPENSERV_WORKFLOW_ID=14063 OPENSERV_TASK_ID=750593 npm run tx:history
SERVJURY_INSPECT_TX_HASH=0x0dff748ffba13d1f8a036e28cd6bc171d75528e42bdbe425daea013afdbdce6f npm run tx:inspect
```

A non-zero `e2e:audit` exit code is a signal E2E is not verified, not approval to retry.

**Request from operator before any new signed task:** redacted Terminal A lines after the new webhook was invoked, especially `SERVJURY GenLayer file_case`, `SERVJURY GenLayer adjudicate_case`, `SERVJURY review not finalized`, `TASK_COMPLETION_UNCONFIRMED`; plus the text of the OpenServ Human Assistance question (no update/auth tokens). Do not share raw request envelopes, full `.env` files or agent secrets.

**Acceptance remains unmet:** both new GenLayer TXs successful, matching `get_case` DECIDED, verified original Task Logs receipt, matching OpenServ Task Output and real session completion.
