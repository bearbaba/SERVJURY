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

## Case B — Filed, awaiting AI adjudication

| Field | Operator-supplied observation |
| --- | --- |
| Case ID | `SJ-INV-20261110-B` |
| Contract | `0x7040Db57D130C9c121Ad7152143b5076abB3c2B5` |
| Claimant | `0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb` |
| Method | `file_case` |
| Transaction | [`0x29a963db2f5c0f2cfce30d878054f51a85c912bf99f5bfcd85765f47ae062450`](https://explorer-studio.genlayer.com/tx/0x29a963db2f5c0f2cfce30d878054f51a85c912bf99f5bfcd85765f47ae062450) |
| Created at | Nov 10, 2026 2:51:25 PM (explorer display time) |
| Finality / GenVM | FINALIZED / SUCCESS |
| Transaction consensus | Accepted; 5 initial validators |
| Fixture details | Source total USD 100; delivered total USD 130; wrong subtotal for INV-B |
| Adjudication transaction | [`0x95b6c7d7c840b1b4f1fae7eefe090f26ffc010b93ffda7b92e59bc12bd99a427`](https://explorer-studio.genlayer.com/tx/0x95b6c7d7c840b1b4f1fae7eefe090f26ffc010b93ffda7b92e59bc12bd99a427) |
| Adjudication time | Nov 10, 2026 2:53:36 PM (explorer display time) |
| Adjudication result | FINALIZED; GenVM SUCCESS; consensus Accepted; 5 initial validators |
| Actual AI verdict | `REWORK` |
| Persisted `get_case` readback | `DECIDED`, `REWORK`, matching nonempty reason (operator-supplied) |
| Reason | INV-B USD 90 instead of required USD 60; total USD 130 instead of USD 100 |

The operator-supplied adjudication transaction and subsequent readback confirm a persisted `REWORK` verdict for this synthetic fixture. This does **not** prove authenticated OpenServ integration or count how many individual validators agreed. Note that the Case B evidence explicitly included the correct answer, so additional blind-evidence/adversarial testing would strengthen evaluation.
