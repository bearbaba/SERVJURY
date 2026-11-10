# SERVJURY read-only chain audit after cancelled OpenServ execution

Observed on 2026-11-10: workflow 14061, agent 4953, current workflow task-node 750591 changed from `to-do` to **`cancelled`**. OpenServ `task:detail` returned no output and no attachments. The original operator-facing webhook request printed only JSON keys `_keepalive,status,error`, so its status was **not** proven successful. Existing Run Mode session was observed cancelled.

## Do not confuse these layers

- The task IDs 750590 / 750591 are OpenServ workflow *task nodes* and may change on declarative workflow sync; they are not unique execution/session IDs.
- A cancelled task node is not evidence of on-chain finality, nor proof that all earlier signed attempts failed.
- SERVJURY's old bridge version sometimes used opaque OpenServ task/workspace update UUIDs when hashing GenLayer case IDs. The new numeric audit checks **numeric-scoped case IDs only** and cannot find old UUID-scoped attempts without those earlier values.
- No new authenticated OpenServ task or final GenLayer receipt has been verified.

## Check the two known numeric-scoped cases without signing

In Codespaces (with latest `main`):

```bash
git pull --ff-only
npm run check
npm run task:chain
```

Default audit checks workflow `14061`, task nodes `750590` and `750591` on the configured SERVJURY contract on GenLayer Studionet 61999. You can explicitly select a task with `SERVJURY_AUDIT_TASK_IDS=750591 npm run task:chain` (nonsecret number). It uses a constant inert public dummy account; the private signer key is not read.

Responses include:

- `TASK_NUMERIC_CASE_NOT_FOUND`: a calibrated missing numeric case on the queried contract; not proof there were no historical UUID-scoped or pending writes
- `TASK_ONCHAIN_STATE` with `FILED_NOT_ADJUDICATED`: persisted on-chain case, no verified verdict
- `TASK_ONCHAIN_STATE` with `DECIDED_READBACK`: persisted and valid verdict for this *numeric-scoped case*; still requires actual transaction hashes and partner task log before declaring end-to-end success
- `TASK_ONCHAIN_UNVERIFIED`: mismatch, unavailable RPC or inconclusive evidence; stop and inspect real chain state before retrying

## Next decisions

1. Never run the task-triggering `--execute` again solely to obtain a clearer error message; it can start another execution.
2. For a cancelled task node/session, use OpenServ's documented UI and session history to decide whether a **fresh, explicitly authorized** task is needed; do not force a stale task to `done` or log a manual judgment.
3. If a new task is authorized, first inspect that there are no outstanding earlier GenLayer transactions. Keep the agent online, monitor its logs, and require FINALIZED/SUCCESS receipt hashes, `DECIDED` readback and matching OpenServ writeback.
