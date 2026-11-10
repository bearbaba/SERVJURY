# SERVJURY — On-chain acceptance evidence

This is an evidence ledger for genuine Studio transactions. Transaction details below are transcribed from the GenLayer explorer output supplied by the operator; they have **not been independently fetched by this repository**. A FINALIZED transaction is not evidence of any later step unless that later transaction and persisted state are also captured.

## Case A — filed on chain

| Field | Observed |
| --- | --- |
| Network | GenLayer Studio explorer (exact chain ID to confirm) |
| Contract | [`0x7040Db57D130C9c121Ad7152143b5076abB3c2B5`](https://explorer-studio.genlayer.com/address/0x7040Db57D130C9c121Ad7152143b5076abB3c2B5) |
| Wallet | `0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb` |
| Method | `file_case` |
| Case ID | `SJ-INV-20261110-A` |
| Synthetic OpenServ task ID | `openserv-demo-invoice-A` (fixture, **not** an authenticated OpenServ task) |
| Transaction | [`0x946adb25248597a4d58de43c19847860a6c8c863944ccf512b211d270b6cfe59`](https://explorer-studio.genlayer.com/tx/0x946adb25248597a4d58de43c19847860a6c8c863944ccf512b211d270b6cfe59) |
| Created at | 2026-11-10 14:37:08 (explorer display time) |
| Status | FINALIZED |
| GenVM execution result | SUCCESS |
| Consensus result | Accepted |
| Initial validators | 5 |
| Return value | null (write call) |

**What is established:** The case-filing call completed successfully according to the supplied explorer transcript.

**Not yet established:** On-chain `get_case` readback, `adjudicate_case` verdict, GenLayer validators' actual judgment outcome, real OpenServ integration or writeback, and partner demo-video acceptance. In particular, the transaction's consensus label “Accepted” is **not** the contract verdict `ACCEPT`.

## Remaining acceptance sequence

1. `get_case("SJ-INV-20261110-A")` → record `FILED` / `PENDING` readback.
2. `adjudicate_case("SJ-INV-20261110-A")` → capture separate **FINALIZED + GenVM SUCCESS** transaction and consensus information.
3. `get_case("SJ-INV-20261110-A")` → record `DECIDED`, the actual verdict, and reason.
4. Repeat for B and C if needed; record observed verdicts (never substitute expected labels).
5. Demonstrate authenticated OpenServ task creation/writeback with its own evidence.

For exact call arguments, use [Studio run card](STUDIO_RUN_NOW.md).
