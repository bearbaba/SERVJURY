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

- The exact independently confirmed `adjudicate_case` transaction hash for this new DECIDED case. DECIDED proves a persisted GenLayer verdict, **not** that this document has both signed transaction hashes.
- The authenticated OpenServ task log writeback containing the finalized verdict, receipt ID and both transaction hashes. The operator's local Agent previously reported `review not finalized; no verified verdict written to task log` after a false-negative receipt check.
- Whether OpenServ's corresponding **run session** was eventually completed. Workflow task node status is distinct from run/session status; a cancelled previous session or task node cannot be silently treated as completed.

## Root cause and tested fix

The old `isFinalizedSuccess` checked `receipt.txExecutionResultName === FINISHED_WITH_RETURN`. Hosted Studionet with `genlayer-js@1.1.8` omits that top-level name, so even a finalized successful `file_case` was treated as unverified. The adapter now verifies consensus FINALIZED **plus** GenVM result from a nonempty, unanimous legacy `consensus_data.leader_receipt` set, or the modern explicit execution result field. It rejects FINALIZED/ERROR and conflicting results.

**No more filing retries** should be sent for case `sj_745eae3d3d0921304a80ec55`; it is already DECIDED. Continue with read-only acceptance evidence and separately verify the OpenServ writeback. If another authenticated run is deliberately authorized, the bridge must first read its unique case ID and must never treat consensus status alone as proof of successful execution.

To inspect safely:

```bash
npm run tx:inspect
npm run task:chain
```

Both commands use a dummy public account and do not require the GenLayer private key.
