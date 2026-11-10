# SERVJURY — isolated E2E acceptance V1 (no replay of Task 750591)

## Why this exists

The original OpenServ workflow **14061** (agent **4953**, task **750591**) already produced a genuine GenLayer Studionet **DECIDED / REWORK** readback and a visible OpenServ receipt **`servjury-2a9e57000de6303a`**. However OpenServ failed Human Assistance recovery with **`AI_InvalidPromptError: messages must not be empty`**, and the task did **not** reach `done`. The adjudication transaction also contains mixed GenVM SUCCESS/ERROR receipts. **Do not restart, mutate or replay that task.**

This path provisions a **new, separately named E2E agent/workflow** only after explicit operator consent. It introduces a nonempty *task input* and *task body* (the OpenServ client SDK's single-task shorthand otherwise defaults input to an empty string), and uses the official `Agent.completeTask()` API **only when both freshly submitted GenLayer writes were strictly verified**, the persisted case identity matches the authenticated task, and the OpenServ receipt-log API acknowledged a write to that same task. The `getTaskDetail` readback must then report `done` with exactly matching output. This is a design improvement **not a proven fix** for the original OpenServ internal AI error.

## Environment and safety

Run in the existing private GitHub Codespace `/workspaces/SERVJURY`. Node >=22, dedicated **Studionet** test signer (chain **61999**) and OpenServ platform **user API key** configured in private Codespaces Secrets / local untracked environment. Never reveal or paste credentials, `.env`, `.openserv.json`, webhook tokens, or private signer keys.

This one E2E test uses a **new OpenServ workflow, agent and test task**. It may write **two fresh GenLayer Studionet transactions** and consume testing credits. It does **not** pay or move crypto assets, but never run against a wallet holding valuables.

### Before touching the network

In the Codespace:

```bash
git pull --ff-only
npm install
npm run check
```

Confirm privately that `ENABLE_LIVE_TRANSACTIONS=1`, `GENLAYER_NETWORK=studionet`, the GenLayer contract address, `GENLAYER_PRIVATE_KEY`, and `OPENSERV_USER_API_KEY` are configured. Set `ALLOW_FIRST_FILING=1` for this **one new task only**. Confirm the intended contract in `src/genlayer.mjs` and `.env`, but never print its private key.

## Terminal A — provision/start an independent E2E agent (explicit mutation)

Stop an older `npm run agent` tunnel in this Codespace via Ctrl+C before starting a new one. Provisioning under **E2E** uses brand-new names and never calls `workflow.sync` on the existing 14061 workflow:

```bash
SERVJURY_AGENT_PROFILE=e2e SERVJURY_ALLOW_INITIAL_PROVISION=1 SERVJURY_COMPLETE_VERIFIED_TASK=1 ALLOW_FIRST_FILING=1 npm run agent
```

Expected only: a new, non-14061 `workflowId`, a new, non-4953 `agentId`, and `Tunnel connected` / agent proxy online. Do not screenshot any unredacted token or webhook.

If provisioning fails, **stop**. Do not delete `.openserv.json` or use the old profile to force regeneration.

## Terminal B — authenticated read-only preflight

```bash
SERVJURY_AGENT_PROFILE=e2e SERVJURY_COMPLETE_VERIFIED_TASK=1 npm run e2e:preflight
```

Pass requires:

- One task node, assigned to the new E2E agent and NOT task #750591.
- The OpenServ server returns **nonempty task `input`, `body` and `description`**.
- A known runnable task-node status: `to-do` or `in-progress`.
- A distinct workflow/agent identity.

This preflight **does not** sign anything or submit a new task. If it fails, inspect and fix the *new* workflow configuration without touching the original 14061 workflow.

## Exactly one new trigger (operator-authorized)

Only after the preflight passes, open Terminal B:

```bash
SERVJURY_AGENT_PROFILE=e2e SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK npm run task:openserv -- --execute
```

The scenario is a fictional incorrect invoice subtotal; the original input does not contain a fabricated verdict. The trigger tool refuses the legacy profile, checks cached E2E agent/workflow IDs and creates a private local `.servjury-e2e-trigger-attempt-<workflowId>.lock` **before** calling the platform. An API timeout/error can mean the request was accepted: **do not remove the marker or execute the command again** without manual server-side audit.

Keep Terminal A running, monitor the new OpenServ Run Mode session. A failed output reviewer, Human Assistance prompt or `AI_InvalidPromptError` means **STOP and inspect**, never `Restart Task` or resubmit the webhook.

## Mandatory E2E acceptance gate

The test is **complete only after all below are independently verified**:

1. **One NEW authenticated OpenServ task** with unique workflow ID and task ID. The current task ID must not be 750591.
2. A NEW `file_case` transaction on Studionet 61999, FINALIZED and strictly **GenVM SUCCESS**.
3. A NEW `adjudicate_case` transaction, FINALIZED and strictly **GenVM SUCCESS**. **Mixed SUCCESS/ERROR receipts do not pass**, even if `get_case` stores `DECIDED`.
4. `get_case(caseId)` returns `DECIDED`, recognized verdict, nonempty on-chain reason, and exactly the authenticated task and evidence.
5. The new task's **Task Logs** visibly contain a matching receipt ID, case ID and verdict, not merely HTTP 200.
6. The **same OpenServ task** is `done` with nonempty Task Output exactly corresponding to the original verified receipt. `completeTask` acknowledgment alone does not satisfy this.
7. OpenServ **Run Mode session** displays a successful terminal status, not `Unexpected Error` or a pending Human Assistance request.

If any gate fails, treat the run as **not yet accepted**; preserve its original task/session IDs and on-chain evidence. Never retry a signed transaction for the same case without first inspecting current finality and contract state.

## Once accepted

Turn off one-shot signing by removing `ALLOW_FIRST_FILING=1` and `SERVJURY_COMPLETE_VERIFIED_TASK=1` from future agent sessions until another deliberately scoped run. Capture the genuine OpenServ task output, original receipt log, two transaction pages and `get_case` for a polished 45-second video. Three official partner logos are required. Do **not** use earlier fixture screenshots as a substitute for the new authenticated E2E run.

[Historical incident evidence](NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md) · [Original live on-chain case](LIVE_STUDIONET_CASE_750591.md)
