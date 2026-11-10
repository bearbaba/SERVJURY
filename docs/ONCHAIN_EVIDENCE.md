# SERVJURY — On-chain acceptance evidence

This ledger records GenLayer Studio transaction details supplied by the operator. Unless independently verified using an explorer or direct state query, entries are **operator-supplied explorer transcripts**, not independently audited claims. A transaction marked `FINALIZED` must also show successful execution; AI output and persisted contract storage are distinct checks.

## Case A — filed and AI-adjudicated on chain

| Field | Observed |
| --- | --- |
| Network | GenLayer Studio explorer (chain ID to confirm) |
| Contract | [`0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`](https://explorer-studio.genlayer.com/address/0x7040Db57D130C9c121Ad7152143b5076abB3c2B5) |
| Wallet | `0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb` |
| Case ID | `SJ-INV-20261110-A` |
| Synthetic OpenServ task ID | `openserv-demo-invoice-A` (**fixture, not an authenticated OpenServ task**) |
| Filing method | `file_case` |
| Filing transaction | [`0x946adb25248597a4d58de43c19847860a6c8c863944ccf512b211d270b6cfe59`](https://explorer-studio.genlayer.com/tx/0x946adb25248597a4d58de43c19847860a6c8c863944ccf512b211d270b6cfe59) |
| Filing time | 2026-11-10 14:37:08 (explorer display time) |
| Filing status | FINALIZED; GenVM SUCCESS; consensus Accepted; 5 initial validators |
| Filing readback (before adjudication) | `get_case` returned `status: FILED`, `verdict: PENDING`, evidence and claimant as filed |
| Adjudication method | `adjudicate_case` |
| Adjudication transaction | [`0x4a512b9c64eeb991f783d1a868ea04d7e33b41e950c3b871f2f065d8ffe2b1b8`](https://explorer-studio.genlayer.com/tx/0x4a512b9c64eeb991f783d1a868ea04d7e33b41e950c3b871f2f065d8ffe2b1b8) |
| Adjudication time | 2026-11-10 14:42:59 (explorer display time) |
| Adjudication status | FINALIZED; GenVM SUCCESS; consensus Accepted; 5 initial validators |
| Equivalence Principle output | Verdict `ACCEPT` |
| AI reason in explorer | "The delivery accurately calculates all subtotals (30, 60, 10) and the grand total (100) as specified in the source rows and terms." |
| Final `get_case` readback | **Confirmed:** `status: DECIDED`, `verdict: ACCEPT`, `reason` persisted and matches the adjudication output; operator-supplied readback transcript |

**Evidence boundary:** The `ACCEPT` verdict was reported in the adjudication's Equivalence Principle output, with successful execution and finality. The operator then supplied `get_case` readback with `DECIDED`, `ACCEPT`, and a reason matching the adjudication output, confirming persistent contract state as observed in Studio. `Consensus Result: Accepted` is a transaction-level consensus status; the actual contract decision is `verdict: ACCEPT`. The explorer reports five **initial** validators, not a detailed count of independent matching votes. This is a synthetic fixture and not evidence of authenticated OpenServ task sync.

## Remaining acceptance sequence

1. **Completed:** `get_case("SJ-INV-20261110-A")` returned `DECIDED`, `ACCEPT`, and the persisted explanation.
2. Use [Studio run card](STUDIO_RUN_NOW.md) to file and adjudicate Case B (intended `REWORK`) and Case C (intended `UNVERIFIABLE`); record **actual** results.
3. Perform negative tests for duplicate filing and duplicate adjudication (the calls should fail).
4. Demonstrate authenticated OpenServ task creation/writeback separately; Studio-only fixture transactions do not prove OpenServ integration.
5. Capture chain ID, transaction links, exact source revision, official three logos and edited video under 45 seconds.

Avoid converting expected outcomes into observed results.
