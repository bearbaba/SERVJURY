# ARCHIVED: V3 WAS TRIGGERED ON 11 NOV 2026 — DO NOT RE-RUN

V3 workflow 14064 / Agent 4956 / Task 750594 reached Human Assistance Required after `adjudicate_delivery` returned `NOT_VERIFIED`. No GenLayer case or TX was verified in the inspected reads. The Agent tunnel did connect, but the underlying failure stage was not logged. This run is frozen. The commands below document its historical procedure only and **must not be executed again**. The V3 profile is now nonlaunchable. The new diagnostic stage labels apply only to future independently authorized execution, not retrospectively to V3.

# SERVJURY — isolated E2E V3 acceptance (prepared; NOT executed)

**Purpose:** Verify one fresh OpenServ task → two strictly verified GenLayer Studionet TXs → `get_case=DECIDED` → original OpenServ task log receipt → matching task output and Done session.

**Historical workflows are frozen.** Do not restart, provision, re-sync or retrigger workflows 14061, 14062 or 14063; do not unlock or retry the old Task 750591/750592/750593 or change their .lock files. E2E V3 uses a **new** agent, workflow, task and on-chain case.

## What the V3 code changes

- New launchable profile `e2e-v3`; V1/V2 remain nonlaunchable.
- Reuses the V2 fail-closed verdict checks and same-TX-hash bounded readback; *never* retries a signed GenLayer write.
- Agent starts SDK tunnel in the existing Codespace. After `run(agent)`, writes a local 0600 readiness marker with PID/port and new workflow/agent IDs; no credentials or webhook URL.
- Preflight and webhook launcher independently require a live matching PID and a successful local `127.0.0.1:<port>/health` check. An unreachable local Agent fails before the trigger.
- **Important:** local PID/health does **not** prove the remote OpenServ proxy is connected, nor guarantee connectivity for the whole run. Watch the SDK's **Tunnel connected** message in Terminal A and keep it running. The SDK reconnects after transient disconnects, but a terminated Codespace is not a persistent hosting service.
- The task must still be `to-do` during preflight. A previous trigger attempt creates a permanent one-shot marker per workflow. Never remove this marker to retry.

## Preconditions (NO transactions in these checks)

Use the existing Codespace and existing secrets. Do not disclose private key, API key, `.openserv.json`, .env, tokenized URLs or raw webhook envelopes.

- `OPENSERV_USER_API_KEY`: OpenServ **platform account** key (not the per-Agent key).
- `GENLAYER_PRIVATE_KEY`: dedicated funded **Studionet-only** test wallet; never a personal mainnet wallet.
- `GENLAYER_NETWORK=studionet`, chain **61999**, `GENLAYER_CONTRACT_ADDRESS=0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`.
- `ENABLE_LIVE_TRANSACTIONS=1`, only for the explicitly authorized test. Understand that a successful run signs up to two Studionet transactions and may create platform resources. **Do not run the final trigger without the operator's separate approval.**

### 1. Update code and verify tests

```bash
cd /workspaces/SERVJURY
git pull --ff-only
npm run check
```

### 2. Terminal A — start **only the new** V3 Agent

Stop any stale legacy Agent gracefully; **do not** restart V1/V2 tasks.

```bash
SERVJURY_AGENT_PROFILE=e2e-v3 SERVJURY_ALLOW_INITIAL_PROVISION=1 SERVJURY_COMPLETE_VERIFIED_TASK=1 ALLOW_FIRST_FILING=1 ENABLE_LIVE_TRANSACTIONS=1 npm run agent
```

Expect **new** agentId/workflowId (not 4953/4954/4955 or 14061/14062/14063), `SERVJURY_V3_LOCAL_READY`, and SDK **Tunnel connected**. Terminal A must stay open throughout. If either signal is absent, **stop here**. Reusing cached V3 credentials is supported without task re-sync; provisioning a new workflow is only authorized for a truly fresh profile.

### 3. Terminal B — read-only preflight

```bash
SERVJURY_AGENT_PROFILE=e2e-v3 SERVJURY_COMPLETE_VERIFIED_TASK=1 npm run e2e:preflight
```

Require `E2E_PREFLIGHT_OK`, task `to-do`, and `V3_LOCAL_AGENT_CHECK` reporting `localAgentHealthy:true`. Its `remoteTunnelVerified:false` is intentional: the proxy must be confirmed separately by the Terminal A connection message.

### 4. Terminal B — ONE new test only after explicit operator authorization

This step invokes OpenServ's webhook and may result in **up to two NEW signed GenLayer Studionet transactions**:

```bash
SERVJURY_AGENT_PROFILE=e2e-v3 SERVJURY_CONFIRM_TASK=RUN_ONE_TEST_TASK npm run task:openserv -- --execute
```

The launcher verifies Agent liveness once more **before** writing the irreversible one-shot marker and firing webhook. Do not stop Terminal A midflight. A timeout/404 is **not** a reason to repeat the command; the server may already have accepted the task.

### 5. Read-only verification after any outcome

Use **new** IDs from V3 only:

```bash
OPENSERV_WORKFLOW_ID=<NEW_WORKFLOW_ID> OPENSERV_TASK_ID=<NEW_TASK_ID> OPENSERV_AGENT_ID=<NEW_AGENT_ID> npm run e2e:audit
OPENSERV_WORKFLOW_ID=<NEW_WORKFLOW_ID> OPENSERV_TASK_ID=<NEW_TASK_ID> npm run tx:history
```

Do not mark the demo accepted unless **both** new GenLayer transactions show FINALIZED + successful GenVM execution, on-chain case is DECIDED with matching original terms/evidence and a reason, original OpenServ task log contains the matching receipt, and OpenServ has the matching verified output in DONE state (with no Human Assistance / Unexpected Error in the final session).

## Failure-handling rule

If the Agent disconnects, a TX times out, or OpenServ requests Human Assistance, **stop and inspect read-only**. Never retry an uncertain hash, repeat `adjudicate_delivery`, delete any one-shot marker, or imply OpenServ DONE alone proves GenLayer verdict. Document the incident. Do not re-use the historical case merely to finish a video.

**Status of this document:** code preparation only; V3 is not yet provisioned, triggered, or accepted. No live calls are performed by the PR or GitHub CI.
