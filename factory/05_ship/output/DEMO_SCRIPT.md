---
type: evaluator-demo-script
stage: 05_ship
unit: append-only-authority-control-history-and-trace-projection-completeness
status: ready-for-review
truth_mode: FIXTURE-and-TEST
created: 2026-08-26
---

# L04 cold evaluator script

## Purpose

Verify that CrossSignal preserves append-only workspace authority history,
binds each consequential effect to the exact current control event, and renders
the complete ordered tenant-scoped redacted trace. This is a FIXTURE/TEST demo,
not a LIVE provider or production tenant claim.

## Prerequisites

- Clean checkout of the candidate commit.
- Node.js 22.13 or newer and npm.
- No production credentials or external provider account is required.

## Cold automated proof

```powershell
npm ci
node factory/05_ship/prepare.mjs
node factory/05_ship/verify.mjs
```

Expected preparation output identifies accepted Stage 04 evidence, persisted
FIXTURE truth, the TEST adapter, and this script. Expected verification output
reports 12/12 acceptance criteria, 12/12 negative cases, 75 independent tests,
3 authority races, 6 migration schedules, 34 reference trace events, a passing
production build, and 3 preserved benchmark stashes.

## Reviewer flow

1. Run `npm run dev` and open the local URL printed by Vinext.
2. Enter through the development owner flow and select the seeded workspace.
3. Confirm the page visibly labels evidence and the persisted narrative trace
   as `FIXTURE`, and the consequential email action as `TEST`.
4. In the authority control, pause actions, resume them, and confirm the
   workspace history retains the complete ordered transition sequence.
5. Authorize the exact TEST action. Confirm the effect appears only after the
   latest unengaged control event and that its persisted trace detail identifies
   the exact authority event sequence/hash used at reservation.
6. Inspect `Persisted FIXTURE trace`. Confirm sequence order is contiguous,
   actors use closed display labels, and no raw payload, actor ID, recipient,
   message body, provider response, credential, or secret appears.
7. Pause again after the completed reservation. Confirm the earlier effect
   still points to its historical authority proof while current authority is
   engaged.
8. Reset the exact FIXTURE trace. Confirm the trace is regenerated while the
   workspace authority-control history remains present.

## Focused negative probes

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-name-pattern "L04" tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs
```

The matching tests prove immutable history, stale race rollback, deterministic
legacy bootstrap, exact effect binding, bounded reset, projection completeness,
tenant collision rejection, and redaction. Nonmatching tests are reported as
skipped by the Node test runner.

## Expected limitations

- No L14 HTTP trace-resolution endpoint exists.
- No LIVE email is sent; the adapter is TEST and evidence/outcomes are FIXTURE.
- A single-workspace screen does not visually prove tenant isolation; database
  and runtime collision tests provide that proof.
- The outcome is correlated fixture evidence, not causal inference.
- Seal verification is performed only after human gate acceptance and commit.

## Stop condition

Stop and reject the release if any truth badge is missing, authority history is
rewritten or lost, an effect lacks the exact control binding, projection order
or count differs, sensitive payload data appears, a tenant probe succeeds, or
any governed verifier exits nonzero.
