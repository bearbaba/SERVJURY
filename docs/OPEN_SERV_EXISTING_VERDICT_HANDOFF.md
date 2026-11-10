# SERVJURY: hand back an EXISTING GenLayer DECIDED verdict to OpenServ

## Current verified case (2026-11-10)

The authenticated OpenServ workflow **14061**, task node **750591** (agent **4953**) is **human-assistance-required**. A read-only platform detail reports **no output** and **no attachments**. The on-chain case `sj_745eae3d3d0921304a80ec55` already reads **DECIDED / REWORK** with stored reasoning on Studionet 61999.

Two real GenLayer transactions have been located:

- `file_case`: `0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376` — FINALIZED, GenVM leader execution SUCCESS/SUCCESS
- `adjudicate_case`: `0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406` — FINALIZED, MAJORITY_AGREE, but leader execution SUCCESS/ERROR (ambiguous under strict-success policy)

**Never say the adjudication transaction has unanimously verified successful GenVM execution.** The persisted DECIDED readback confirms the verdict independently. No new adjudication is necessary or permitted on that case. OpenServ still needs the same task's receipt log and a resolved Human Assistance state before end-to-end acceptance can be claimed.

## Step 1 — safe PREVIEW without writing to OpenServ

In the original Codespace using the existing, authorized OpenServ secrets:

```bash
git pull --ff-only
npm run check
npm run task:handoff
```

The last command verifies the **exact** task, agent, workflow, contract case ID, immutable task public reference, saved verdict, filing TX success and the MIXED adjudication receipts; it prints a sanitized one-shot handoff preview. It does not need the GenLayer signing key; it cannot create a task, send a webhook, or sign a transaction.

If task status has changed from `human-assistance-required`, or the same task cannot be verified, the preview deliberately refuses to build the handoff.

## Step 2 — inspect the OpenServ Human Assistance prompt

Open [OpenServ Platform](https://platform.openserv.ai/) → `SERVJURY Delivery Review` → Run Mode → task **750591**. The Human Assistance question may ask for on-chain proof, whether to retry, or a manually supplied verdict.

Do **not** manually invent the verdict or authorize a retrigger. The correct reference is the existing GenLayer `get_case` **DECIDED/REWORK** readback and the audited TX hashes, with the mixed GenVM receipt caveat.

If OpenServ has **already** recorded a GenLayer verdict in its task log, STOP; don't write a duplicate.

## Step 3 — OPTIONAL explicit one-shot log write to same task

Only after inspecting the original Human Assistance request, confirming the task has **no existing SERVJURY receipt log**, and explicitly choosing to add just one authenticated log entry, use:

```bash
SERVJURY_CONFIRM_HANDOFF=ONE_LOG_ONLY npm run task:handoff -- --write-log
```

- Uses the locally provisioned **OpenServ agent API key** to call the SDK-documented `POST /workspaces/14061/tasks/750591/log` route, with the original task and cached agent identity verified using the **OpenServ user API key**.
- Writes only a truthful existing-readback receipt with full case reference, actual verdict/reason and two observed TX hashes. It explicitly marks adjudication execution as **MIXED_SUCCESS_ERROR_NOT_UNANIMOUSLY_CONFIRMED**.
- **Does not** trigger a webhook, call `file_case`, call `adjudicate_case`, update task status or mark the OpenServ workflow complete.
- Before attempting the HTTP POST it atomically creates a **private, local one-attempt marker** `.servjury-handoff-attempt-750591.lock`. Do **not** delete it or bypass it automatically, even if a POST fails: the server could have recorded the log before the client timed out.
- On an HTTP/API failure the CLI prints only sanitized status information. Stop and inspect the OpenServ task log; do not retry blindly.

This operator-only log handoff might be **rejected** by OpenServ if its task status or authorization policy does not permit logging during Human Assistance. A successful HTTP response is only an acknowledgment of the log write, **not** of task completion. Return to Run Mode to verify the same task's log and resolve the existing Human Assistance request through the documented UI, without changing the recorded verdict.

## Acceptance remaining

Confirm the receipt appears in the existing task **750591**, its verdict matches `get_case`, and the same OpenServ Run Mode session reaches its appropriate terminal success status. Otherwise classify the integration **ONCHAIN_VERDICT_CONFIRMED / OPENSERV_WRITEBACK_UNVERIFIED**. Do not create a replacement task as a way to pretend the original workflow completed.
