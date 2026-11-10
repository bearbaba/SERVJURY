# SERVJURY OpenServ webhook retry — diagnostic record (2026-11-10)

## Observations

The operator deliberately invoked `SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK npm run task:openserv -- --execute` a second time after reopening their OpenServ Run Mode session. The launcher printed only the top-level JSON keys `_keepalive`, `status`, and `error`. **It did not print the value of `status`**, so this is not proof the webhook succeeded or that a GenLayer verdict finalized. A second call must not be made automatically.

`npm run task:inspect` then returned exactly one current workflow task node: **750591**, `to-do`, agent **4953**, workflow **14061**. The previous detail inspector defaulted to **750590** and reported HTTP 404. **Do not equate the change in task-node ID with confirmation that the webhook created a completed execution.** The official OpenServ platform client's `provision()` updates the existing workflow with `workflow.sync()`; `syncInternal()` sends `status: 'to-do'` in task definitions and can create/replace task IDs. The UI's Run Mode sessions and workflow task definitions are different concepts.

## Remediation

1. Normal `npm run agent` now reuses `.openserv.json` credentials and calls `agent.setCredentials` and `run(agent)`, **not** `provision()`, to avoid resetting task status or IDs. Explicit initial provisioning is available only if no cached state exists and `SERVJURY_ALLOW_INITIAL_PROVISION=1` is supplied. Incomplete cached state never triggers silent reprovision.
2. `task:detail` now uses the one current task node from OpenServ automatically; `OPENSERV_TASK_ID=<numeric ID> npm run task:detail` overrides it if necessary.
3. The task inspector labels current workflow task nodes as definitions, not execution history.
4. The webhook trigger launcher now reports only sanitized status, whether the payload contains an error, and a classification. A transport 2xx with `{status:'error',error:...}` is **ERROR**, not success. It never prints raw OpenServ errors or update tokens. This is for future authorized triggers; do not trigger merely to test logging.

## Operator next steps (read-only)

- Keep the old webhook result and OpenServ session in place. Do not send another `--execute`.
- Stop old Codespaces agent with Ctrl+C before updating code.
- `git pull --ff-only && npm run check`
- `npm run task:inspect && npm run task:detail`
- Start agent with `npm run agent`, and confirm `cached credentials reused; existing workflow was NOT re-synced`. Do not set the provisioning opt-in for this existing workspace.
- In OpenServ dashboard **Run Mode**, inspect the existing session activity and task status/error. A fresh task node reported as `to-do` is not sufficient to conclude a task ran.
- Only use a documented 'resume existing execution' UI action if needed after inspecting earlier transactions, and never create an extra webhook task to debug a previous one.

## Acceptance

Only report the end-to-end as complete when the specific OpenServ execution is traceable to **both** GenLayer `file_case` and `adjudicate_case` tx hashes with FINALIZED+SUCCESS, persisted `get_case DECIDED`, and a matching authenticated OpenServ task log.
