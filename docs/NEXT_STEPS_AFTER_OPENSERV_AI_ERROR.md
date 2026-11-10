# SERVJURY — Next steps after OpenServ AI_InvalidPromptError (2026-11-10)

## Evidence that is genuinely verified

- Existing authenticated OpenServ workflow: **14061**, agent **4953**, task node **750591**.
- GenLayer Studionet chain **61999**, contract `0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`.
- Existing case `sj_745eae3d3d0921304a80ec55` is **DECIDED / REWORK**, with nonempty on-chain reason.
- `file_case` TX `0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376`: FINALIZED, both leader receipts SUCCESS.
- `adjudicate_case` TX `0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406`: FINALIZED / MAJORITY_AGREE but leader GenVM receipts **SUCCESS / ERROR**. Do not call it unanimously successful.
- OpenServ received one authenticated log-only handoff, receipt **`servjury-2a9e57000de6303a`**. The operator separately verified this receipt in the original Task 750591 Logs, not merely an HTTP acknowledgment.

## What is NOT complete

- Task 750591 did not reach `Completed` or populate the Task Output.
- Human Assistance response failed and OpenServ displayed `(AI_InvalidPromptError) Invalid prompt: messages must not be empty`. The same error appeared in Task Logs and the task's `Unexpected Error` state.
- Do not attribute this definitively to SERVJURY's code or to OpenServ's backend without request/response or platform trace evidence. An empty task Input is visible in the UI; SDK provisioning also supplies a default empty task input. That alone does **not** prove which component assembled the empty AI message list.
- The original task must not be restarted, duplicated or silently re-provisioned merely to obtain a clean success screenshot.

## Correct immediate steps

1. **Freeze the evidence.** Keep the current Run Mode task logs, the on-chain verdict, TX hashes and receipt. Do not retry `--execute`, `--write-log`, `file_case` or `adjudicate_case`.
2. **Escalate the AI context error to OpenServ** with workflow 14061 / task 750591 / agent 4953, UTC timestamp and sanitized screenshots of the error and the existing receipt. Ask whether the *same* task can be resumed without resetting its prior log.
3. **Do not edit Task 750591** or run `provision()` against workflow 14061. The repository's ordinary `npm run agent` reuses cached credentials; it must not re-sync the workflow.
4. **Prepare truthful hackathon evidence** using the already confirmed OpenServ task log and GenLayer readback. Show the task remains unresolved; do not present it as fully Completed.
5. **After OpenServ provides a supported recovery path**, evaluate a separately authorized single E2E validation. For any new workflow, use a different ID/name and an explicit nonempty task description and body; never mutate the existing live workflow while this evidence is under review.

## Preventive code changes in this release

- `verifyLivePlatformTask` accepts only observed runnable states `to-do` and `in-progress`. `Unexpected Error`, `human-assistance-required`, `cancelled`, `done`, unknown states or absent status all **fail closed** before new signed GenLayer writes.
- Fresh explicit provisioning supplies a nonempty task body. This is a **preventive configuration improvement**, not a fix for OpenServ's existing AI session or a guarantee that Human Assistance will resume.
- All changes are local/GitHub only. They do **not** alter the existing OpenServ task or contract.

## Exact acceptance gate still open

For a complete OpenServ workflow acceptance, the *same* task session must reach an appropriate successful terminal state with a truthful output and a verified persisted GenLayer verdict and original task-log receipt. Until then describe SERVJURY as an **authenticated OpenServ ↔ GenLayer integration demonstrated up to task-log writeback**, with OpenServ workflow completion unresolved.
