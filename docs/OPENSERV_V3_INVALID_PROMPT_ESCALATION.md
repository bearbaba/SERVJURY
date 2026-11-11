# OpenServ incident report — V3 Human Assistance followed by AI_InvalidPromptError (11 November 2026)

## Summary

SERVJURY is an Internet Court × OpenServ × GenLayer partner demo. Its V3 OpenServ task **750594** on workflow **14064**, assigned to agent **4956**, invoked the actual **adjudicate_delivery** capability, which returned **NOT_VERIFIED**. It then requested Human Assistance. In the latest operator-observed task UI, the task moved to **Unexpected Error** with:

```text
Unexpected error: (AI_InvalidPromptError) Invalid prompt: messages must not be empty
```

This is a **separate failure** from why `adjudicate_delivery` returned NOT_VERIFIED. We do not know whether the underlying GenLayer case was absent, the read failed, or the capability encountered a different failure; the prior capability catch handler suppresses raw errors. There is no evidence of completed E2E adjudication.

## Observed facts (operator-provided task UI and terminal logs)

- Workflow ID: **14064**
- Agent ID: **4956**
- Task ID: **750594**
- Chain: **GenLayer Studionet 61999**
- Contract: `0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`
- Deterministic case ID: `sj_86ec9ecbb6536b49d2e6d069`
- Agent local server started on port **7378**; OpenServ tunnel reported **Tunnel connected** and **Agent connected to OpenServ proxy**.
- OpenServ Task Logs include **Tool call: adjudicate_delivery** and **Tool call: out_request-human-assistance**.
- Human Assistance request states the capability returned **NOT_VERIFIED**, no on-chain DECIDED readback, no verified receipt and no original TX hash was provided.
- After the Human Assistance stage the OpenServ UI displayed **Unexpected Error** with the **AI_InvalidPromptError** quoted above. The UI shows nonempty Description and Input, so their mere presence does not establish whether the platform's internal model `messages` array is valid.
- Earlier read-only `e2e:audit` failed to get a parseable `get_case` result and printed `GenLayer RPC error (gen_call): execution failed`.
- Earlier read-only `tx:history` inspected **11** contract transactions and returned **NO_CASE_TRANSACTION_MATCH_IN_INSPECTED_HISTORY**, which is *not* proof that no TX exists.
- Task Output remained **No output** and no task-linked receipt or DECIDED state was verified.
- A separate earlier legacy task **750591** also encountered `AI_InvalidPromptError: messages must not be empty` during Human Assistance recovery; that legacy task had a verified on-chain DECIDED/REWORK state and a visible OpenServ task-log receipt, but did not reach DONE. This suggests a potentially recurring Human Assistance/session-message failure; it does **not** conclusively establish a root cause in OpenServ.

## Support request to OpenServ maintainers

Please investigate the workflow execution/session-message assembly for task **750594**, specifically after a capability returns `NOT_VERIFIED` and after the `out_request-human-assistance` transition. We request:

1. A redacted server-side trace showing which component called the AI SDK with an empty `messages` array, the relevant operation/session IDs, and whether the human-assistance response was accepted.
2. Confirmation whether the task can be **safely closed as unresolved** without retrying `adjudicate_delivery`, re-triggering the webhook, or invoking any GenLayer write.
3. Guidance on a platform-supported fix, or whether an SDK/API change is necessary for the Human Assistance → completion/error transition.
4. Clarification whether `expectedOutput` being unset, missing session conversation history, or request/response normalization can lead to this error, and which fields are required. These are hypotheses, **not** diagnosed causes.
5. A supported read-only way to retrieve sanitized capability execution status and run/session history for the original task without exposing authenticated webhook tokens or private payloads.

The public demo has intentionally **not** been marked E2E PASS. Do not restart, replay or repair Task 750594 by signing a transaction. Never share private keys, full webhook URLs/tokens, secret `.env` files or raw sensitive task payloads.

## Public references

- Code: https://github.com/bearbaba/SERVJURY
- Frozen V3 runbook: [E2E_ACCEPTANCE_V3.md](E2E_ACCEPTANCE_V3.md)
- Previous live OpenServ task incident: [NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md](NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md)
- AI SDK error definition: https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-invalid-prompt-error

## Status

**OPEN — provider investigation needed.** No verified evidence of a successful V3 verdict, task receipt or DONE output. V3 is frozen in source code. This report does **not** authorize task replay or new transactions.
