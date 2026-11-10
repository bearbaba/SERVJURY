# Partner Demo Lab — SERVJURY submission quality gate

Mission window listed in portal: **9–23 November 2026**. The operator's dashboard displayed **weekly limit reached**. A code push or GenLayer transaction does not itself submit to the mission.

## Observed product status

| Criterion | Supporting evidence | Status |
| --- | --- | --- |
| Authentic integration concept | Internet Court × OpenServ × GenLayer delivery adjudication | Defined |
| GenLayer is essential | [Intelligent Contract](../contracts/ServJury.py) uses independent AI re-evaluation and stores the verdict | Verified on Studio for three cases |
| Real GenLayer proof | [On-chain evidence ledger](ONCHAIN_EVIDENCE.md), three finalized successful adjudications and persisted reads | **Complete for synthetic acceptance fixtures** |
| Reproducible user interface | [Local demo](../demo/) and [skill](../SKILL.md), fixtures labeled honestly | Local automated tests pass |
| Robust bridge | [OpenServ bridge](../src/openserv-bridge.mjs) rejects mismatched evidence and fails closed on transport errors | Isolated tests pass |
| Authenticated partner round trip | [Actual OpenServ task → GenLayer → same OpenServ task log](OPENSERV_LIVE_ACCEPTANCE.md) | **Not yet independently run** |
| Public clean repository | [SERVJURY GitHub](https://github.com/bearbaba/SERVJURY), tests, documents and CI | Published |
| Edited 45-second video | Actual OpenServ task/log, real GenLayer tx/readback, official three logos, polished motion | **Not yet delivered** |
| Security & claim discipline | Dedicated test signer, no escrow claims, no unverified OpenServ sync claims | Code guards; live verification outstanding |

## Reviewer-facing narrative

**Title:** SERVJURY — AI Jury for OpenServ Task Disputes

**One-liner:** When an AI agent's delivery is contested, SERVJURY submits the fixed task requirements and evidence to GenLayer's AI jury and returns an auditable verdict to the original OpenServ task.

**Technical proof:** On GenLayer Studio, three independent test scenarios finalized with persisted results: ACCEPT for a correct invoice, REWORK for a mathematically incorrect invoice, and UNVERIFIABLE for a claim without supporting audio/transcript evidence. The adapter uses the authenticated OpenServ task/workspace context to derive a stable case ID, and only writes the on-chain verdict back to its task log after finality and data matching. The OpenServ writeback itself **still needs an authenticated live acceptance run**.

**Limitations that must remain truthful:** Studio fixture task IDs are not OpenServ task IDs. No funds are held or paid. The cases do not prove third-party evidence provenance; Case B's supplied evidence already states the correct total. Five *initial* validators does not prove five matching individual votes. Do not cite private-key or platform API credentials.

## Highest-value remaining checks

1. Run one real task through the documented OpenServ provisioning flow; capture both platform task and GenLayer case ID.
2. Verify the actual `addLogToTask` receipt on the original task. Use the stable `receiptId` for manual duplicate detection; exactly-once log delivery has not been established.
3. Run one adversarial case with evidence that does **not** explicitly include the correct answer.
4. Export the final sub-45-second edit with official logos and transcript/QR or source link.
5. Confirm mission submission capacity has reopened and submit public GitHub and video URL.

**Readiness estimate, not an official score:** roughly **8.2/10** on the provided rubric at the moment; the milestone to aim for **9.5/10** is real partner closed-loop evidence and a strong final video.
