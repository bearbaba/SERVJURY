# GenLayer Studio-first acceptance

Network/chain ID: **write the actual values used**; the old Studio 61999 network and newer Studio Dev 61997 are not interchangeable. GenLayer SDK chain configuration must match the deployment.

## Test 1 — supported claim (ACCEPT)

```
file_case(
  "SJ-001", "openserv-1042",
  "Produce a three-company comparison with one dated URL per company and a short conclusion",
  "Three companies compared; dated links for A, B, and C; short conclusion included",
  "A: 2026-11-09 https://example.org/a; B: 2026-11-09 https://example.org/b; C: 2026-11-09 https://example.org/c; conclusion included"
)
adjudicate_case("SJ-001")
get_case("SJ-001")
```

**Important:** the supplied example.org URLs here are synthetic fixture text, not genuine verification of external websites. For the real demo use publicly accessible source URLs and a truthful deliverable. Whether this deserves ACCEPT must be decided by live validators; never preset or guarantee it.

## Test 2 — material breach (REWORK)

```
file_case(
  "SJ-002", "openserv-1043",
  "Produce a three-company comparison with one dated URL per company and a short conclusion",
  "Three companies compared and a conclusion provided; no dated sources",
  "Submission text is available; number of dated source links in output: zero"
)
adjudicate_case("SJ-002")
get_case("SJ-002")
```

Expected intent: REWORK. Actual AI-validator result must be recorded as observed, including if it disagrees.

## Test 3 — missing evidence (UNVERIFIABLE)

```
file_case("SJ-003", "openserv-1044",
  "Provide a working analysis with dated citations",
  "Agent says its output is complete",
  "No output or verifiable citation was supplied")
adjudicate_case("SJ-003")
get_case("SJ-003")
```

Expected intent: UNVERIFIABLE. Record actual result.

## Negative cases

- Repeat `file_case("SJ-002", …)` => expected rollback (immutable case ID).
- Repeat `adjudicate_case("SJ-002")` after success => expected rollback (one decision).
- Call `adjudicate_case("unknown")` => expected rollback.
- File missing evidence, oversized input => expected rollback.
- Prove the two independent executions are not only validating JSON shape; inspect validator consensus diagnostics.
- Never claim OpenServ sync based on the browser's simulated stage: verify the actual task log from the agent capability.

## Evidence record (fill after REAL tests)

| Test | Chain ID | Contract | Write TX | Consensus | Execution | get_case readback | OpenServ task/log |
|---|---|---|---|---|---|---|---|
| ACCEPT | | | | | | | |
| REWORK | | | | | | | |
| UNVERIFIABLE | | | | | | | |
| Negative replay | | | | | | | |

Do not fabricate links, hashes, validator results, task IDs or partner authorizations.
