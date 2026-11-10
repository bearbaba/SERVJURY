# Recover the existing OpenServ task 750590 without creating a duplicate

## Verified

- OpenServ workflow **14061**, agent **4953**, persistent task **750590**.
- OpenServ client read-only task list and detail returned **human-assistance-required**, no output, and no attachments.
- The first authenticated webhook invocation reached the `adjudicate_delivery` capability, but GenLayer returned `gen_call execution failed` for the new case before any observed signed transaction.
- No finalized GenLayer writes or authenticated OpenServ verdict writeback for this task are evidenced yet.
- Initial OpenServ `do-task` runtime event used opaque per-invocation UUIDs for `action.workspace.id` and `action.task.id`, while the persistent workflow task is the numeric ID 750590.

## Safety guard added

`src/openserv-stable-identity.mjs` uses provisioned numeric workflow ID and a single unambiguous numeric task ID from the authenticated action's workflow graph. It verifies that task via a read-only `PlatformClient.tasks.get` API call, checks the assigned agent and description, and refuses a task that remains `human-assistance-required`, `done`, or `cancelled`. It never commits opaque update UUIDs on-chain. If a workflow has multiple task nodes and OpenServ sends only an opaque update token, it fails closed.

## Next operator action

1. In Codespaces, stop any agent process running old code; do not trigger the webhook again.
2. Update to latest `main`, `npm install`, and run `npm run check`.
3. Run `npm run task:inspect` and `npm run task:detail`; both are read-only.
4. In [OpenServ Platform](https://platform.openserv.ai/), open workflow **SERVJURY Delivery Review (14061)**, task **750590**. Read the **human assistance request** and task activity. Do not blindly mark `done` or reassign it.
5. Only after understanding the request and confirming there is no transaction already pending, use a documented **resume/retry the same task** UI action, if provided by OpenServ. Restart the patched agent first. If none is available, do not invent an API endpoint or force status.
6. Do not run `npm run task:openserv -- --execute` to recover this task. That command triggers a **new** OpenServ execution.
7. Confirm actual signed `file_case` and `adjudicate_case` transaction hashes as FINALIZED / successful execution, persisted on-chain `DECIDED` readback, and the same OpenServ task's receipt log before claiming integration complete.

The status `human-assistance-required` does **not** by itself tell us the exact human request. Neither `client.tasks.get` nor the current read-only `/detail` summary exposes that question. Do not infer what help is needed from the status alone. No secrets, tokens, or authenticated task payloads should be pasted into public logs.
