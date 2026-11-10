# SERVJURY — verified 44-second demo film

**Goal:** Produce one polished **44-second, 1920×1080, 30 fps, English** Hackathon demo using screenshots/recordings of actual OpenServ, GenLayer Studio and Studionet Explorer. Prefer five short screen captures over re-running anything on-chain.

**Important acceptance limit:** An authenticated OpenServ task has produced a GenLayer **DECIDED / REWORK** readback and a receipt visible in the task logs. The OpenServ workflow has **NOT** reached `Completed`: Human Assistance recovery raised `AI_InvalidPromptError`. The adjudicate_case transaction is `FINALIZED / MAJORITY_AGREE`, but its two GenVM leader execution receipts are **SUCCESS and ERROR** (not unanimous). Do not imply successful E2E completion, escrow, payment settlement or a unanimous adjudication execution.

## Exact editing timeline

| Video | What to record on a real screen | On-screen English text | Voiceover idea |
| --- | --- | --- | --- |
| 00:00–00:04 | Original SERVJURY title slate with **three official partner logos** | `When AI delivery is disputed, who decides?` | “Who decides when an AI agent's delivery is disputed?” |
| 00:04–00:11 | **OpenServ Run Mode** workflow 14061, authenticated Task 750591. Show header and genuine task context; avoid using blank Input as proof of submitted payload | `OpenServ · Authenticated task #750591` | “SERVJURY begins with a real OpenServ task and evidence.” |
| 00:11–00:18 | **GenLayer Studio** deployed `ServJury.py`. Focus on the actual `file_case`, `adjudicate_case`, `get_case` methods. Do not click Call or sign | `GenLayer · Immutable evidence and AI jury` | “The dispute is anchored to a GenLayer Intelligent Contract.” |
| 00:18–00:28 | Explorer: `file_case` `FINALIZED` with success receipts; show `adjudicate_case` `FINALIZED / MAJORITY_AGREE`, then **real `get_case` readback** `DECIDED / REWORK`. Keep the case ID visible | `On-chain case → DECIDED · REWORK` | “The AI jury reviews the evidence. Its REWORK verdict is recorded and readable on-chain.” |
| 00:28–00:39 | **Original OpenServ Task #750591 Logs** where existing `servjury-2a9e57000de6303a` receipt is visible. Zoom to the receipt and matching GenLayer case ID, NOT to an invented Task Output | `Original OpenServ task · Auditable receipt` | “The recorded verdict is linked back to the original OpenServ task through its audit log.” |
| 00:39–00:44 | Final clean slate: SERVJURY + **three official logos** + repository | `SERVJURY · Evidence first. Verifiable decisions.` plus small readable `Workflow completion pending` | “SERVJURY. Evidence first. Decisions you can verify.” |

At 44 seconds, allow transitions of roughly 200–300 ms within these blocks; don't compress the apparent blockchain finality time or pretend real calls happened during the short video. These are **edited historical recordings** of genuine evidence.

## Exact evidence to capture (no new signed operations)

**GenLayer contract and source:**
- [ServJury.py](https://github.com/bearbaba/SERVJURY/blob/main/contracts/ServJury.py)
- [Deployed Studionet contract](https://explorer-studio.genlayer.com/address/0x7040Db57D130C9c121Ad7152143b5076abB3c2B5) — Chain **61999**
- [file_case TX](https://explorer-studio.genlayer.com/tx/0x318fba389317e3b1986568273ca3c9cc3008aa4ea18ffa61ab11a134b5553376) — `FINALIZED`, GenVM leader `SUCCESS/SUCCESS`
- [adjudicate_case TX](https://explorer-studio.genlayer.com/tx/0xfaf3cb1fc7bc95e81c9e6950ceeee8ee640aaeb3010ab6a4c2ec6a2612c50406) — `FINALIZED / MAJORITY_AGREE`; execution receipts **SUCCESS/ERROR**. Do **not** overlay `SUCCESS` on this individual TX
- [Readback and evidence ledger](LIVE_STUDIONET_CASE_750591.md) — case `sj_745eae3d3d0921304a80ec55`, `DECIDED / REWORK`

**OpenServ:** [OpenServ Platform](https://platform.openserv.ai/) → SERVJURY Delivery Review → Run Mode → Task **750591** → Task Logs → receipt **`servjury-2a9e57000de6303a`**. The entry was visibly confirmed by the operator; output was still empty and the Human Assistance resume action raised an AI context error.

If `get_case` cannot be displayed in Studio without a signed action, show the **read-only** Codespaces terminal command `npm run task:chain` and its actual `TASK_ONCHAIN_STATE` line. Do not simulate a verdict, alter an input to force a fixture, or present terminal printout as an on-chain transaction.

## Five captures to record

1. OpenServ original workflow and task header (no log scrolling, no form submission).
2. GenLayer Studio smart-contract source: file/adjudicate/get methods (no deployment or calls).
3. Explorer `file_case` receipt plus Explorer `adjudicate_case` finality; read-only `get_case` verdict.
4. OpenServ original task log with exact receipt ID visible.
5. Static final slate, created in editing software, with all three **official** logos.

Capture 10–20 s per screen at 1080p (or 1440p downscaled); the final edit uses only selected segments. Prefer normal scrolls and direct crop/zoom; skip the Codespaces setup, npm install logs, private wallets, and long debugging footage. Do not invent a live timing claim.

## Sound, logos and deliverables

- Use original English voiceover, well-timed readable subtitles, no copyrighted music without permission.
- Use official logo assets. [GenLayer brand kit](https://genlayer.com/brand); request/download official Internet Court and OpenServ logos from their brand materials. Don't use generated approximations.
- Mask **all** wallet private keys, API tokens, webhook URLs, auth headers, browser session cookies and agent update UUID tokens.
- A small readable footnote in the end slate is mandatory for this evidence set: **`On-chain verdict + OpenServ task-log receipt verified. Workflow completion pending.`**
- Export `SERVJURY_DEMO_44S.mp4`, H.264, 1080p, 30 fps; provide the public video link and the GitHub repo in the submission form when capacity permits. Keep longer uncut source captures privately for review.
- Don't claim money was paid, a buyer used the contract commercially, the OpenServ task reached Completed, or every GenVM execution receipt agreed.

**Suggested English voiceover (approximately 75 words)**

> Who decides when an AI agent's delivery is disputed? SERVJURY begins with a real OpenServ task and its evidence. The dispute is anchored to a GenLayer Intelligent Contract. The AI jury reviews the submitted case, and a REWORK verdict is recorded on-chain. The verdict can be read independently, then linked to the original OpenServ task through an auditable receipt. SERVJURY: evidence first, decisions you can verify.

The final slate and caption should distinguish the **verified receipt** from OpenServ's **unfinished workflow**. See [the AI context error runbook](NEXT_STEPS_AFTER_OPENSERV_AI_ERROR.md).
