---
name: servjury
version: 0.1.0
description: Reproduce an Internet Court × OpenServ × GenLayer agent delivery dispute demo and send verified outcomes to an OpenServ task.
---

# SERVJURY demo skill

**Safety boundary:** Never treat the fixture as a network ruling. Never commit funds, send payments, or use a production signer. This skill does not grant authority over any wallet.

## Local demonstration

1. Run `npm run demo` with Node.js >=22.
2. Open `http://127.0.0.1:4173`.
3. Select **Missing evidence**, file the case, then click **Request jury decision**. Observe **REWORK** labeled OFFLINE FIXTURE.
4. Repeat for **Delivery accepted** (ACCEPT), **Contested proof** (UNVERIFIABLE).
5. Change any evidence. The local preview MUST return UNVERIFIABLE; it cannot adjudicate new data.

## Production-like test flow (explicit user authorization and configured test signer)

1. Deploy `contracts/ServJury.py` in GenLayer Studio and record the real chain/contract address.
2. Install dependencies, export `ENABLE_LIVE_TRANSACTIONS=1`, `GENLAYER_NETWORK`, `GENLAYER_CONTRACT_ADDRESS` and a dedicated funded `GENLAYER_PRIVATE_KEY`.
3. Run `npm run demo` locally and submit one case; verify the real tx hash and finalized `get_case` state.
4. To exercise the partner bridge, run `npm run agent` with OpenServ provisioned credentials, and invoke the `adjudicate_delivery` capability from an OpenServ workflow. Verify the SDK logged the resulting verdict to that exact task.
5. Do not say 'partner integrated on-chain' until both on-chain transactions and the OpenServ task log have been observed.

If the GenLayer transaction returns a hash and then errors/times out, use that hash for investigation; DO NOT blindly resubmit. A finalized receipt must also show successful execution.
