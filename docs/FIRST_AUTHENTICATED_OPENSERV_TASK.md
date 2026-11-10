# SERVJURY — first genuine OpenServ task: status and recovery

Date: 2026-11-10 (reported Codespaces session)

## Confirmed from operator logs

- OpenServ user API key passed platform read-only authentication.
- Agent **4953**, workflow **14061**, external OpenServ agent tunnel connected.
- A real OpenServ webhook task was dispatched into the `adjudicate_delivery` capability. The workflow's numeric task node appeared as **750590**, with runtime-generated task/workspace context IDs.
- Two capability attempts for the same authenticated task failed at `get_case` because hosted Studionet RPC returned `InvalidInputRpcError / -32000 / gen_call: execution failed` for a never-filed case. **No signed transaction hash was present in those attempts, and neither a finalized GenLayer verdict nor a successful OpenServ task-log receipt has yet been observed.**
- The OpenServ orchestration layer changed the original `evidence` argument by adding its own corrected arithmetic and proposed verdict before invoking the capability. This is **not acceptable as immutable submitted evidence** and is fixed by reading the original webhook trigger payload instead.

Never publish original error logs without removing the OpenServ workspace/task update tokens or any wallet secrets.

## Patches in this PR

1. Calibrate the hosted RPC missing-case response with **two read-only calls on the same deployed contract**: a known finalized Case A, and a guaranteed unfiled sentinel. Permit first filing only when the target matches the sentinel failure and the known read succeeds. `ALLOW_FIRST_FILING=1` and the deployed contract's immutable duplicate guard remain mandatory.
2. Accept `terms`, `delivery`, and `evidence` **only from the authenticated task's original webhook event**, never edited/AI-generated capability args.
3. Process each task once in flight, return sanitized `NOT_VERIFIED` on failure rather than allowing OpenServ SDK to dump tokens in error logs.
4. Commit only a domain-separated SHA-256 public task reference to the GenLayer contract; never place OpenServ task/workspace update tokens in immutable chain state or in receipt text. The original authenticated context is retained only during capability execution.\n5. Attach both the actual filing TX hash and actual adjudication TX hash to a successful OpenServ receipt and log finalized writes safely.
6. Add a read-only `npm run task:inspect` command. It only lists task IDs and statuses for workflow **14061**; does not create a new task, write a task log or sign GenLayer TXs.
7. Add deterministic regression tests and live Studionet read-only RPC-calibration CI (zero wallet keys).

## How to continue the existing attempt safely

Do **not** execute the webhook task command again while the previously created OpenServ task's status is unknown.

In Codespaces, stop the old `npm run agent` terminal with Ctrl+C and update:

```bash
git pull --ff-only
npm install
npm run check
npm run task:inspect
```

Inspect workflow 14061 for task status, including task node 750590. If the task is failed or already completed, first inspect its activity and any on-chain transaction hashes. If the OpenServ platform exposes a retry/resume control for the **same task**, use that only after confirming no unresolved transactions. Do not assume that `npm run agent` alone replays a failed task.

Then start the patched agent:

```bash
npm run agent
```

Maintain the agent in one terminal. A second webhook execution creates a new task and is NOT a retry of the existing task. If a new task is ever needed, it requires a new, deliberate one-shot trigger after evaluating the original task.

## Acceptance still pending

- The original or a deliberately authorized new authenticated OpenServ task must successfully file to GenLayer, with a FINALIZED/SUCCESS `file_case` transaction.
- GenLayer `adjudicate_case` must reach FINALIZED/SUCCESS with persisted DECIDED status and verdict readback.
- The exact immutable evidence from the first webhook must match the on-chain case, and the public task reference must match the SHA-256 digest of that task's private OpenServ execution context.
- The same authenticated OpenServ task must have a task log containing `caseId`, `receiptId`, actual verdict, reason, and available transaction hashes.

A plausible verdict from a local fixture or from OpenServ's orchestration LLM **does not** count as chain evidence.
