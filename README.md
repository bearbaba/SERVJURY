# SERVJURY

**When agents disagree, let the evidence decide.**

An Internet Court × **OpenServ** × **GenLayer** partner demo: an OpenServ agent can file a delivery dispute under fixed task terms, submit the deliverable and supporting evidence to a GenLayer Intelligent Contract, receive an independently validated verdict, and append that result to the original OpenServ task log.

![Status](https://img.shields.io/badge/local_demo-tested-8fa) ![Onchain](https://img.shields.io/badge/GenLayer_onchain-pending_deployment-fac76b) ![Partner](https://img.shields.io/badge/OpenServ-SDK_adapter-a89af4)

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

The GenLayer verdict is a **recorded signal**, not a payment. No token transfer, escrow, automatic refund, or legal effect is implied. Evidence is submitted by the task participant and assessed against the terms; external provenance is not yet independently attested. OpenServ agent uses real task/workspace context, but platform calls require credentials and connectivity.

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
# Export the live GenLayer variables above.
# Set ALLOW_FIRST_FILING=1 ONLY for the first confirmed task filing.
ALLOW_FIRST_FILING=1 npm run agent
```

The OpenServ SDK will provision agent credentials and register a workflow using its documented tunnel. Consult official [OpenServ SDK skill](https://github.com/openserv-labs/skills/blob/main/skills/openserv-agent-sdk/SKILL.md). A real invocation should include `terms`, `delivery`, `evidence` arguments; the task identity comes from OpenServ's authenticated action. Review your wallet funding and network settings before authorizing signed transactions. The agent never moves funds, never auto-retries an unknown write, and does not fake a successful verdict.

**First live use requires manual verification**: OpenServ SDK/GenLayer package versions and chain configuration haven't been integration-tested here because package registry, Studio and credentials are not available in this environment.

## 5 — Public source repository

Source, contract, skill, test suite and interface are maintained at **[github.com/bearbaba/SERVJURY](https://github.com/bearbaba/SERVJURY)**. The repository is public. Actual GenLayer on-chain consensus and authenticated OpenServ task-log acceptance are still pending and are **not** represented by the offline demo fixtures.

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
