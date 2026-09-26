# Phase 6 — bounded local scenario matrix

Date: 2026-09-25 (Asia/Kolkata).

**Direction correction — 2026-09-26:** Preserve this matrix as detector
regression coverage. The current priority is [one complete A01 synthetic
investigation and approved intervention](a01-synthetic-investigation-handoff.md).
The absence of a real TEST checkout is not a blocker for that hiring milestone.
The history below explains how this slice arose; it does not set the next step.

## Why this slice

The Phase 5 replay checks one golden Case end to end. The repository has no
server-observed payment checkout: the TEST harness lets an operator select a
simulated capture or decline, and the real manual recheck form is intentionally
absent from the current Case view. An actual Mobile Safari visit to that
harness would test its browser behavior, not establish payment capture. No
existing TEST checkout endpoint was available for this work, so the real
receipt, device verification, and business outcome remain pending.

This slice broadens **local detection evaluation** using the existing pure
product detector. It does not add a payment provider or change the deployed
Case.

## Run and boundary

From `work/crosssignal-phase1`:

```sh
node scripts/run-case-scenario-matrix.mjs
```

`npm run replay:matrix` is the package alias; this host's global npm shim is
broken, so the direct Node command is the verified route. The command starts
`scripts/case-scenario-matrix.mjs` twice in fresh processes, compares exact
JSON bytes, then passes the artifact to the separate
`tests/evaluator/grade-case-scenario-matrix.mjs` process. Only the grader
reads `tests/evaluator/case-scenario-matrix.truth.json`. Generated evidence is
in `reports/case-scenario-matrix.artifact.json` and
`reports/case-scenario-matrix.md`.

The runner reuses `buildGoldenEvents` and `detectRevenueLeak`. It applies
bounded counterfactual changes to completion rates, desktop control, traffic
volume, and recorded revenue, plus malformed-input probes. It does not read
evaluator answers, call a model, access a database or payment provider, or
write TEST/LIVE data. All valid observations remain `FIXTURE` data.

## Verification evidence

- Seven valid variants produced two detected signals and five `no_signal`
  results. Six invalid inputs were rejected: missing event, duplicate event,
  foreign workspace, ledger mismatch, LIVE truth mode, and evaluator-data
  injection. These deliberately chosen variants do **not** estimate field
  detection accuracy or satisfy the proposed 100-case benchmark.
- The grader independently recomputed metric totals and thresholds from each
  valid 56-event input, checked all three evidence citation sets per variant,
  compared hidden expected results, and verified input hashes. Two fresh
  runner processes produced the same artifact SHA-256
  `e71100cd69caa4cfb02a2b8e912b3871e73e453f38081ab5897eafbcca6d1c2e`.
- The matrix test changed a detection label, a metric, a citation list, and a
  rejection result in turn; the separate grader failed each altered artifact.
- The focused product and replay suite passed **29/29**:
  `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs tests/case-simulation-outcome.test.mjs tests/golden-case-replay.test.mjs tests/case-scenario-matrix.test.mjs`.
- `git diff --check` passed. The pre-existing untracked
  `supabase/.temp/cli-latest` file was left untouched. The historical factory
  gates were not advanced.

The [matrix report](../reports/case-scenario-matrix.md) gives each variant's
result and the event references for detected signals. The golden Case remains
unresolved. A real TEST checkout requires an observable external result before
a Mobile Safari check can support a distinct real receipt; future follow-up
observations would still support correlation only.
