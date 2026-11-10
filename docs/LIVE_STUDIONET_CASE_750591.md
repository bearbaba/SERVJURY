# First signed OpenServ → GenLayer result (2026-11-10)

## Verified on public Studionet RPC (chain ID 61999)

- Deployed contract: `0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`.
- An OpenServ-initiated `file_case` transaction was submitted with hash `0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376`.
- A read-only `genlayer-js@1.1.8` `getTransaction` returned `statusName: FINALIZED` and the correct contract recipient.
- In this Studionet SDK, the top-level `txExecutionResultName` is missing. The **actual GenVM execution status** is stored as `consensus_data.leader_receipt[].execution_result`, and both returned leader receipt entries reported **SUCCESS**. The adapter now handles this older format but refuses mixed or missing results.
- A separate read-only `get_case` against the same contract with the numeric-workflow task case ID `sj_745eae3d3d0921304a80ec55` (OpenServ workflow **14061**, task node **750591**) returned:
  - status: **DECIDED**
  - verdict: **REWORK**
  - on-chain reason: **present** (not empty)
  - public task ref: `os_4e7c7760122987d8a2939d8be538ef2e`
- Case ID for old node 750590 `sj_3a257b76a1d687b84dee051e` remained unfiled at read time.

## Still missing

- The public contract-history query now locates the `adjudicate_case` transaction **`0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406`** for the same case ID. The decoded calldata contains the `adjudicate_case` method marker and case ID; consensus is **FINALIZED / MAJORITY_AGREE**. However, its two `leader_receipt[].execution_result` entries are **SUCCESS and ERROR**, so the strict `isFinalizedSuccess` guard correctly reports **UNCONFIRMED**, rather than falsely asserting unanimous GenVM success. The persisted `get_case` view independently proves **DECIDED / REWORK**.
- The adjudication transaction's **unambiguous successful GenVM execution status remains unverified** because these receipt entries conflict. The on-chain verdict is persisted, but the transaction must not be mislabeled `FINALIZED / SUCCESS`.
- The OpenServ task log writeback is **now acknowledged** by the authenticated API for Task 750591, receipt `servjury-2a9e57000de6303a`. The task activity/UI must still be independently inspected to prove the entry persisted and the workflow was resumed; the earlier Agent log had reported an unverified receipt.
- Whether OpenServ's corresponding **run session** was eventually completed. On the latest operator read-only inspection on 2026-11-10, workflow node **750591** was **human-assistance-required** with no output or attachments; previous observations had shown `cancelled`. Workflow task-node status is distinct from run/session status, and neither state is evidence of a successful task log writeback.

## Root cause and tested fix

The old `isFinalizedSuccess` checked `receipt.txExecutionResultName === FINISHED_WITH_RETURN`. Hosted Studionet with `genlayer-js@1.1.8` omits that top-level name, so even a finalized successful `file_case` was treated as unverified. The adapter now verifies consensus FINALIZED **plus** GenVM result from a nonempty, unanimous legacy `consensus_data.leader_receipt` set, or the modern explicit execution result field. It rejects FINALIZED/ERROR and conflicting results.

**No more filing retries** should be sent for case `sj_745eae3d3d0921304a80ec55`; it is already DECIDED. Continue with read-only acceptance evidence and separately verify the OpenServ writeback. If another authenticated run is deliberately authorized, the bridge must first read its unique case ID and must never treat consensus status alone as proof of successful execution.

To inspect safely:

```bash
npm run tx:inspect
npm run task:chain
```

Both commands use a dummy public account and do not require the GenLayer private key.

## Critical SDK compatibility fix following verified readback

`genlayer-js@1.1.8` `waitForTransactionReceipt()` defaults to **`fullTransaction: false`**, which calls `simplifyTransactionReceipt` and strips `consensus_data.leader_receipt`. Merely updating `isFinalizedSuccess` to inspect leader receipts is insufficient if it receives the simplified receipt. The adapter now explicitly passes **`fullTransaction: true`**, verifies both `FINALIZED` and the actual GenVM execution, and uses `getTransaction` only as a read-only fallback if the receipt is incomplete. Regression tests assert the exact wait arguments and refuse conflicting or errored GenVM results.

**This is a fix for future transaction confirmation, not evidence the cancelled OpenServ workflow was recovered.** Do not replay the completed case to test the patch. The `adjudicate_case` hash has now been located, but its **conflicting GenVM execution receipts** and the still-unverified OpenServ task activity readback / terminal completion remain separate acceptance gaps. The authenticated log API did acknowledge one request.


## Read-only verification record — 2026-11-10 14:31 UTC

The following is grounded in actual Studionet RPC queried by GitHub Actions (not fixture data):

| Property | file_case | adjudicate_case |
| --- | --- | --- |
| Tx hash | `0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376` | `0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406` |
| Case ID in calldata | Match | Match |
| Method marker | file_case | adjudicate_case |
| Consensus status | FINALIZED | FINALIZED |
| Consensus result | MAJORITY_AGREE | MAJORITY_AGREE |
| Legacy leader GenVM results | SUCCESS / SUCCESS | SUCCESS / ERROR |
| Strict successful-execution proof | Yes | **No — conflicting receipts** |

`get_case` readback **DECIDED/REWORK** is real evidence of persisted state. No user task has been retriggered, no new GenLayer transaction signed, and no OpenServ log was written by these audits. The current workflow node should be inspected in OpenServ **Run Mode** for its latest Human Assistance request, but do not answer with an invented manual verdict or force a cancelled session to `done`.

Read-only commands:
```bash
npm run task:chain
npm run tx:history
SERVJURY_INSPECT_TX_HASH=0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406 npm run tx:inspect
npm run task:detail
```

## Operator-observed OpenServ receipt handoff — 2026-11-10

The operator ran the new script on the original Codespace, after `git pull --ff-only` to commit `b2a82e01` and **77/77** checks PASS (72 JS, 5 Python). The **read-only** preflight confirmed:

```text
EXISTING_TASK_HANDOFF_PREFLIGHT {"workflowId":14061,"taskId":750591,"agentId":4953,"caseId":"sj_745eae3d3d0921304a80ec55","taskStatus":"human-assistance-required","onchainStatus":"DECIDED","verdict":"REWORK","receiptId":"servjury-2a9e57000de6303a","filingExecution":"FINISHED_WITH_RETURN","adjudicationExecution":"MIXED_SUCCESS_ERROR_NOT_UNANIMOUSLY_CONFIRMED","target":"existing OpenServ task log ONLY"}
```

The operator then executed **one** explicitly authorized log-only request and received:

```text
OPEN_SERV_LOG_WRITE_ACKNOWLEDGED {"workflowId":14061,"taskId":750591,"receiptId":"servjury-2a9e57000de6303a"}
```

This acknowledgment means the OpenServ log write API returned without error for the original **task 750591**. It **does not** prove the receipt is visible in OpenServ's task activity UI, task output is populated, Human Assistance is resolved, or the Run Mode session completed. The task previously remained `human-assistance-required` with no output. Verification of OpenServ UI history and terminal success remains outstanding.

**Important:** Do **NOT** repeat `SERVJURY_CONFIRM_HANDOFF=ONE_LOG_ONLY npm run task:handoff -- --write-log`. The single-attempt marker `.servjury-handoff-attempt-750591.lock` is intentional and should remain intact. Do not retry the webhook or send new GenLayer writes for this already-DECIDED case. In OpenServ Run Mode inspect the existing Task 750591 activity/log for the exact receipt ID, then handle the still-open Human Assistance prompt by referencing this existing proof without inventing a verdict or re-adjudicating.
