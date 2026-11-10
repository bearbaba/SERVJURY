# SERVJURY

**When agents disagree, let the evidence decide.**

**Live partner evidence (10 Nov 2026):** Authenticated OpenServ task **750591** reached GenLayer Studionet, which stored **DECIDED / REWORK**; the original OpenServ Task Logs display the authenticated receipt **`servjury-2a9e57000de6303a`**. OpenServ **did not complete the task**: Human Assistance recovery failed with `AI_InvalidPromptError: messages must not be empty`. [Verified evidence and recovery status](docs/NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md). Do not replay the existing task.

**Latest E2E finding (Task 750592):** OpenServ marked Task 750592 `done` and reported output, but the public GenLayer `get_case` read for `sj_bee8c5dbfb0aa4805ba169db` was still **FILED, not adjudicated**. This is **NOT** a passed closed-loop demo. [Exact evidence and read-only triage](docs/E2E_TASK_750592_DIAGNOSIS.md). No retry is authorized.\n\n**E2E V2 (isolated next run):** [Read the V2 acceptance runbook](docs/E2E_ACCEPTANCE_V2.md). V1 Task 750592 ended as OpenServ DONE but its GenLayer case stayed FILED after `file_case` receipt confirmation failed. V2 uses the fixed same-hash readback and **new** agent/workflow identities; both old workflows are frozen. Nothing has been retriggered or signed by the V2 code changes.\n\n**Next acceptance run:** [Isolated OpenServ E2E V1](docs/E2E_ACCEPTANCE_V1.md) uses a separate agent/workflow, explicit nonempty task input, strictly verified *fresh* filing and adjudication, one task-log receipt, and SDK `completeTask` with a verified `done` output. It cannot touch or retry the old Task 750591. This is prepared code, **not** an accepted new E2E result.\n\n**On-chain acceptance:** [Three finalized GenLayer verdicts and stored readbacks](docs/ONCHAIN_EVIDENCE.md) — **ACCEPT / REWORK / UNVERIFIABLE** at [`0x7040Db57…abB3c2B5`](https://explorer-studio.genlayer.com/address/0x7040Db57D130C9c121Ad7152143b5076abB3c2B5). A real OpenServ task-log writeback is verified; workflow completion remains an open acceptance gate: [recovery status](docs/NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md).

An Internet Court × **OpenServ** × **GenLayer** partner demo: an OpenServ agent can file a delivery dispute under fixed task terms, submit the deliverable and supporting evidence to a GenLayer Intelligent Contract, receive an independently validated verdict, and append that result to the original OpenServ task log.

![Status](https://img.shields.io/badge/local_demo-tested-8fa) ![Onchain](https://img.shields.io/badge/GenLayer-3_cases_finalized_success-8fa) ![Partner](https://img.shields.io/badge/OpenServ-task_log_verified-8fa)

### What it actually does

```text
OpenServ task context ─── submitted deliverable + evidence
        │                           │
        └─────────────┬─────────────┘
                      ▼
        GenLayer Intelligent Contract
          file_case() — immutable terms
                      │
       adjudicate_case() — LLM leader
                      │
          Validators independently
         re-assess original evidence
                      │
       ACCEPT | REWORK | UNVERIFIABLE
                      │
             get_case() readback
                      │
     OpenServ task log includes final verdict
```

The GenLayer verdict is a **recorded signal**, not a payment. The three displayed Studio acceptance cases use fictional inputs, not authenticated OpenServ task IDs. No token transfer, escrow, automatic refund, or legal effect is implied. Evidence is submitted by the task participant and assessed against the terms; external provenance is not yet independently attested. OpenServ agent uses real task/workspace context, but platform calls require credentials and connectivity.

## 1 — Run the polished offline demo (zero dependencies)

Node.js >=22. At the project root:

```bash
npm run demo
# open http://127.0.0.1:4173
npm run check
python -m unittest discover -s tests -p 'test_*.py' -v
```

Choose **Missing evidence**, **Delivery accepted**, or **Contested proof**; file and review the case. These three results are intentionally fixed offline fixtures and are explicitly labeled **not on-chain**. Editing an input forces UNVERIFIABLE rather than pretending a novel AI conclusion.

## 2 — Deploy the Intelligent Contract in GenLayer Studio

1. Open [GenLayer Studio](https://studio.genlayer.com/), select the appropriate network.
2. Import `contracts/ServJury.py` and deploy `ServJury` (no constructor arguments).
3. Call `file_case` with a fresh ID and the original OpenServ task terms, delivery and evidence.
4. Call `adjudicate_case` on that ID, await consensus and **FINALIZED + successful execution**.
5. Read `get_case(case_id)`, and save **deployment address, chain ID, actual TX hashes, validator decision and readback**.

**Do not reuse an earlier GenLayer deployment from unrelated projects.** The contract must really exist and correspond to this source. Detailed acceptance in [`docs/STUDIO_ACCEPTANCE.md`](docs/STUDIO_ACCEPTANCE.md).

## 3 — Connect real GenLayer from the interface

```bash
npm install
cp .env.example .env
# Fill only your .env with: GENLAYER_NETWORK, GENLAYER_CONTRACT_ADDRESS,
# GENLAYER_PRIVATE_KEY (dedicated test account), ENABLE_LIVE_TRANSACTIONS=1
# shell: source .env  (or explicitly export variables; Node does not auto-load .env)
npm run demo
```

For Windows Git Bash:

```bash
set -a; source .env; set +a
npm run demo
```

When live mode is enabled, the UI calls `file_case`, waits for finalization, calls `adjudicate_case`, waits for finalization, and reads back `get_case`. **The browser's live mode does not itself synchronize a task to OpenServ**; that is the real partner agent's separate capability (next step). The local fixture button must not be used as proof of partner sync.

**Security:** NEVER deploy the demo server with the private signing key to a public host. It is deliberately loopback-only; each live click signs a transaction using the local server key. Use a dedicated funded test account, not your main wallet.

## 4 — Run the OpenServ partner integration

This is an actual OpenServ runnable capability, not a fake REST mock. It uses `@openserv-labs/sdk` and `@openserv-labs/client`, gets an authenticated OpenServ task/workspace ID from the agent action, constructs a stable case ID, interacts with GenLayer, then calls `addLogToTask` with the verdict.

```bash
npm install
# Configure GENLAYER_PRIVATE_KEY and a separate OPENSERV_USER_API_KEY as
# private Codespaces Secrets (never place either one in GitHub source).
# Set ALLOW_FIRST_FILING=1 ONLY for a reviewed new task.
ALLOW_FIRST_FILING=1 npm run agent
```

**OpenServ authentication note (10 Nov 2026):** Wallet-nonce login returned HTTP 404 on the live platform. SERVJURY therefore requires a separate OpenServ **platform user API key** via `OPENSERV_USER_API_KEY` and fails closed without it. This is not the agent's `OPENSERV_API_KEY`, nor the GenLayer private signing key. [Troubleshoot the 404 safely](docs/OPENSERV_AUTH_404.md).

The OpenServ SDK can provision an agent and a webhook workflow using its documented tunnel. Consult official [OpenServ SDK skill](https://github.com/openserv-labs/skills/blob/main/skills/openserv-agent-sdk/SKILL.md). A real invocation should include `terms`, `delivery`, `evidence` arguments; the task identity comes from OpenServ's authenticated action. Review your wallet funding and network settings before authorizing signed transactions. The agent never moves funds, never auto-retries an unknown write, and does not fake a successful verdict.

**Current live acceptance status:** authenticated provisioning, task-linked GenLayer case writes and readback, and task-log receipt display have been observed for task **750591**. The associated OpenServ task is **not Completed**; Human Assistance recovery failed with `AI_InvalidPromptError`. The GenLayer `adjudicate_case` TX is FINALIZED but has mixed GenVM leader receipts (SUCCESS/ERROR), so unanimous execution success must not be claimed. Do not repeat this task or handoff. [See recorded evidence](docs/LIVE_STUDIONET_CASE_750591.md) and [next steps](docs/NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md).

## 5 — Public source repository

Source, contract, skill, test suite and interface are maintained at **[github.com/bearbaba/SERVJURY](https://github.com/bearbaba/SERVJURY)**. The repository is public. GenLayer Studio **three-way on-chain adjudication** is evidenced by operator-supplied transaction details and persisted `get_case` readbacks: [ACCEPT, REWORK and UNVERIFIABLE](docs/ONCHAIN_EVIDENCE.md). **An authenticated OpenServ receipt is visible in Task 750591 logs**; however the session remains incomplete due to an OpenServ AI context error. The earlier standalone Studio fixtures must not be represented as authenticated partner synchronization.

## 6 — Capture mission evidence

See [`docs/VIDEO_45S.md`](docs/VIDEO_45S.md) for a 45s editing guide including all three **official** logos; [`docs/SUBMISSION.md`](docs/SUBMISSION.md) for quality gate. Make the final video with **actual** GenLayer TX/readback and OpenServ task log. Never replace real evidence with fixture screenshots.

### Project structure

```text
contracts/ServJury.py        GenLayer independent AI-validator contract
src/genlayer.mjs             live GenLayer SDK adapter (finalization checks)
src/engine.mjs               isolated offline fixtures
agent/openserv-agent.mjs     real OpenServ partner agent capability
demo/                       dependency-free responsive web interface
SKILL.md                    reproducible agent instructions
tests/                      unit/fixture and GenLayer-runtime stub tests
docs/                       Studio acceptance, demo/edit plan, submission checklist
```

### References

- [Internet Court open skill](https://github.com/internet-court/internet-court-skill)
- [Internet Court — agentic commerce](https://internetcourt.org/blog/internet-court-agentic-commerce)
- [GenLayer consensus](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle)
- [GenLayer contract reads/writes](https://docs.genlayer.com/developers/decentralized-applications/writing-data)
- [OpenServ SDK](https://github.com/openserv-labs/sdk)

MIT licensed example (see LICENSE). Not affiliated with or endorsed by consortium partners.
