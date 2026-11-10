# SERVJURY — Studio run card (10 November 2026)

**Source:** [contracts/ServJury.py](../contracts/ServJury.py). Pinned GenVM runtime, no constructor arguments. These examples are **synthetic fixtures**, not real OpenServ task IDs.

## Deploy directly from GitHub

1. Open [GenLayer Studio](https://studio.genlayer.com/); choose the intended network and note the actual chain ID (**Studio Dev 61997** and older **Studionet 61999** are different).
2. Open **Contracts → New Contract** and name it `ServJury.py`.
3. Paste the full code from https://raw.githubusercontent.com/bearbaba/SERVJURY/main/contracts/ServJury.py into the editor.
4. Run and Debug → Deploy `ServJury` (no constructor parameters). Save address and deployment hash.
5. Wait for **FINALIZED + successful execution** for every write, not just a submission hash.

## Case A — arithmetic evidence supports delivery

Call `file_case` with these five strings:

| Field | Value |
| --- | --- |
| case_id | `SJ-INV-20261110-A` |
| task_id | `openserv-demo-invoice-A` |
| terms | `Calculate invoice subtotals and the grand total in USD using source rows: INV-A quantity 2 at USD 15, INV-B quantity 3 at USD 20, INV-C quantity 1 at USD 10. Include each invoice ID and subtotal.` |
| delivery | `INV-A: 2 x 15 = USD 30. INV-B: 3 x 20 = USD 60. INV-C: 1 x 10 = USD 10. Grand total = USD 100.` |
| evidence | `Original task data: INV-A qty=2 unit_price=15 USD; INV-B qty=3 unit_price=20 USD; INV-C qty=1 unit_price=10 USD. All source rows and calculations are visible in text. No external source is claimed.` |

Then call `get_case("SJ-INV-20261110-A")`: expect `FILED / PENDING`. Call `adjudicate_case("SJ-INV-20261110-A")`, wait for finalized success, then call `get_case("SJ-INV-20261110-A")` again. **ACCEPT is the intended result, not a promised LLM verdict.**

## Case B — material arithmetic violation

Call `file_case` with:

| Field | Value |
| --- | --- |
| case_id | `SJ-INV-20261110-B` |
| task_id | `openserv-demo-invoice-B` |
| terms | `Calculate invoice subtotals and the grand total in USD using source rows: INV-A quantity 2 at USD 15, INV-B quantity 3 at USD 20, INV-C quantity 1 at USD 10. Include each invoice ID and subtotal.` |
| delivery | `INV-A = USD 30. INV-B = USD 90. INV-C = USD 10. Grand total = USD 130.` |
| evidence | `Original task data: INV-A qty=2 unit_price=15; INV-B qty=3 unit_price=20; INV-C qty=1 unit_price=10. INV-B should equal 60, not 90. Correct grand total is 100, not 130.` |

Run `adjudicate_case("SJ-INV-20261110-B")` then `get_case("SJ-INV-20261110-B")`. Intended verdict **REWORK**, subject to real consensus.

## Case C — evidence unavailable

Call `file_case` with:

| Field | Value |
| --- | --- |
| case_id | `SJ-INV-20261110-C` |
| task_id | `openserv-demo-interview-C` |
| terms | `Summarize the three main customer complaints in the supplied audio interview and cite timestamps.` |
| delivery | `Agent claims the top complaints were onboarding friction, pricing confusion, and delayed support.` |
| evidence | `No recording, transcript, timestamps or primary source was provided. The three claimed complaints cannot be independently checked.` |

Run `adjudicate_case("SJ-INV-20261110-C")` then `get_case("SJ-INV-20261110-C")`. Intended verdict **UNVERIFIABLE**, subject to consensus.

## Replay checks and on-chain evidence

- Re-file an existing ID → should revert (immutable case).
- Re-adjudicate a case already decided → should revert (single verdict).
- Adjudicate `unknown` → should revert.

Capture **chain ID, deployed contract address, every write hash, finality, consensus/votes, readback JSON**. These Studio fixtures do **not** prove OpenServ sync. For partner evidence, separately run the authenticated OpenServ capability and inspect the task log. Never present an offline fixture as a genuine partner task.

For the 45-second cut, choose a single actual signed decision and show the live Studio transaction and persisted readback with all three official logos.
