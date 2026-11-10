# SERVJURY — E2E Task #750592 cross-check (Nov 10, 2026)

## The observed outcome

An operator launched the one-shot **isolated** OpenServ E2E workflow **14062**, agent **4954**, task **750592**.

- Fresh configuration preflight: `to-do`, nonempty `input`, `body`, and `description` — PASS.
- One webhook response: sanitized `{"status":"SUCCESS","result":"ACKNOWLEDGED_NOT_VERIFIED","errorPresent":false}`. This proves a response, **not** a GenLayer result.
- OpenServ Task Detail, retrieved with the platform user key: `{"taskId":750592,"status":"done","outputPresent":true}`.
- OpenServ Task Logs displayed `Output reviewer: approved (9/10)` after one or more reviewer iterations; `Tool call: adjudicate_delivery` appeared, **but no same-task verified receipt was shown in the supplied log excerpts**.
- **Authoritative GenLayer Studionet RPC read-only case audit**: `{"taskId":750592,"caseId":"sj_bee8c5dbfb0aa4805ba169db","publicTaskRef":"os_7f3859df5184dc44c8c32087168b9d4b","status":"FILED","result":"FILED_NOT_ADJUDICATED"}`.

### Interpretation

**This E2E execution has NOT passed.** OpenServ declared the task `done`, but the original on-chain case remained `FILED` (pending adjudication), not `DECIDED`. A score of 9/10 by the OpenServ Output Reviewer is not a GenLayer execution result. A `DONE` status alone is not sufficient because the platform's orchestration model may complete a task independently of the local SERVJURY capability's strict `completeTask()` gate. The currently shown logs cannot establish *why* the task was only filed; possibilities include a rejected or still-in-flight transaction, SDK receipt uncertainty or a capability failure before a GenLayer adjudication write. **Do not infer a specific root cause from these excerpts.**

## Safe next diagnostics — no signed retries

Update Codespaces to the latest main, then inspect only existing task and chain state:

```bash
git pull --ff-only
OPENSERV_WORKFLOW_ID=14062 OPENSERV_TASK_ID=750592 OPENSERV_AGENT_ID=4954 npm run e2e:audit
OPENSERV_WORKFLOW_ID=14062 OPENSERV_TASK_ID=750592 npm run tx:history
```

`e2e:audit` uses authenticated OpenServ task reads plus a **public GenLayer read**, printing only status, IDs and safe evidence classification. It never prints raw task output or private credentials. `tx:history` scans public contract history for exactly the new task's derived case ID, displaying matching tx hash, consensus status, method hints and stored GenVM leader receipts; it never signs.

A nonzero exit code from `e2e:audit` can mean **unverified E2E**, rather than a script failure. Do not rerun the webhook just because it exits nonzero. An unavailable or truncated history query does not mean no transactions occurred.

Read Terminal A (the existing agent process) **without publishing raw sensitive material**. Share only redacted lines:
- `SERVJURY GenLayer file_case:`
- `SERVJURY GenLayer adjudicate_case:`
- `SERVJURY review not finalized`
- `SERVJURY authenticated OpenServ receipt written:`
- `SERVJURY OpenServ completion not confirmed`

The second item may reveal a transaction hash; a hash can be inspected without sending another TX. If there is an existing `adjudicate_case` TX, inspect its original hash/finality/GenVM receipts **before proposing any further action**.

## Honest acceptance definition

The new task can be claimed as a successful end-to-end GenLayer judgment **only when** `get_case` shows `DECIDED`, a nonempty on-chain reason, both fresh file/adjudicate hashes are confirmed as successful GenVM executions, and the original OpenServ task shows a matching receipt log and final output. Recheck OpenServ Run Mode's session-level status separately.

**Freeze Task 750592 for now:** no `Restart Task`, webhook retry, `file_case`, `adjudicate_case` or additional task-log write. Keep the original Task 750591 unchanged as well.

See [the initial clean-run plan](E2E_ACCEPTANCE_V1.md) and [original case 750591](LIVE_STUDIONET_CASE_750591.md).
