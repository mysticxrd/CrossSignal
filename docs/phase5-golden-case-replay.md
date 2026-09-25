# Phase 5 — offline golden-Case replay

Date: 2026-09-25 (Asia/Kolkata).

## Checkout and scope

The implementation lives in the existing Git checkout at
`C:\Users\hisha\ChatGPT\CrossSignal\work\crosssignal-phase1`, branch
`codex/phase3-decision-ux`, starting at `fdd612b`. Its `origin` still names the
obsolete OneDrive path, but no remote was used. The checkout initially had one
untracked `supabase/.temp/cli-latest` file; it was left untouched. The outer
`C:\Users\hisha\ChatGPT\CrossSignal` checkout and its untracked note were
also left untouched. No clone or repository initialization occurred.

Run from this checkout:

```sh
node scripts/run-golden-case-replay.mjs
```

`npm run replay:golden` is an equivalent package alias where npm is installed
correctly. On this Windows host, the global npm shim points to a missing
`npm-cli.js`, so the direct Node command is the verified one-command route.

## Process boundary

`scripts/golden-case-replay.mjs` is the offline product runner. It builds the
existing golden events and calls the detector, persisted-Case Investigator,
response builder, Case projection, checkout simulator, and simulation
assessment. It does not import or read the evaluator answer. It uses fixed
fixture IDs and timestamps, with no database, network, provider, model, or
payment call.

`scripts/run-golden-case-replay.mjs` launches the product runner twice in fresh
processes and requires byte-identical JSON. It writes the generated artifact
through stdin to the separate `tests/evaluator/grade-golden-case.mjs` process.
After grading passes, it writes `reports/golden-case-replay.artifact.json` and
`reports/golden-case-replay.md`. Only the grader reads
`tests/evaluator/golden-revenue-leak.truth.json`. The grader independently
checks expected metrics, event and content hashes, evidence and Investigator
citations, displayed trace IDs, both checkout traces, assessment transitions,
and the intentional failure results.

The replay includes a **local surrogate** approval, receipt, and trial marker
to exercise the existing exclusion rule. That local receipt hash is not the
saved TEST trial receipt. The replay neither reads nor changes persisted TEST
data, including the saved trial receipt. SIMULATED runs cannot become
real check receipts, Mobile Safari device verification, or measured business
outcomes. The Case remains unresolved. LIVE was not contacted or changed.

## Verification

- One-command replay passed. Two fresh runner processes produced identical
  artifact SHA-256 `df7eadbdc7569bcb1116087c51c1bd17e19fbf52f3159e4a780ebc14fe4294c2`.
- The grader verified 56 fixture observations, 42 evidence references, 42
  Investigator references, two distinct three-event simulation traces, and
  capture plus decline coverage. Capture-only and repeated-capture runs remain
  `in_progress`; reversing the saved run order leaves the assessment hash
  unchanged.
- Twelve deliberate invalid inputs were rejected, including missing or
  duplicate events, foreign tenant bindings, missing or foreign citations,
  modified investigation content, injected evaluator data, tampered or
  duplicate simulation traces, a LIVE-labelled artifact, and a simulation ID
  masquerading as a real check receipt. A below-threshold case stayed
  `no_signal`.
- `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs tests/case-simulation-outcome.test.mjs tests/golden-case-replay.test.mjs`
  passed **28/28**. The replay test also changed four generated artifact
  fields in turn and confirmed that the separate grader failed each time.
- `git diff --check` passed. The prior factory release remains a historical
  accepted run; this tooling did not seal a new run or claim a human gate.

The [generated report](../reports/golden-case-replay.md) lists the exact
recorded-event and simulation trace references. Its results describe local
fixture behavior only, not the persisted TEST runs from Phase 4e or actual
Mobile Safari behavior.
