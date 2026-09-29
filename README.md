# CrossSignal — Revenue Leak Investigator

The current hiring milestone is one complete synthetic A01 Case: investigate
competing causes, seek contradictory evidence, obtain exact approval for a
simulated intervention, observe its result, and grade the trace independently.
The A01 [Spec](factory/01_spec/output/SPEC.md) and
[Data package](factory/02_data/output/DATA_PACKAGE.md) are accepted. The local
[Build](factory/03_build/output/BUILD_EVIDENCE.md) is accepted.
[Verification](factory/04_verify/output/VERIFICATION_REPORT.md) is accepted.
The [local mechanics preview](factory/05_ship/output/RELEASE_MANIFEST.md) is
ready for final packaging review; follow its [cold demo](factory/05_ship/output/DEMO_SCRIPT.md).
Model evaluation and actual human runtime approval remain NOT RUN.
See the [current checkpoint](docs/a01-release-status.md).

## Run the local A01 Case

```powershell
node --experimental-strip-types scripts/run-a01.mjs
```

This writes five independently graded, repeatable SIMULATED comparisons under
`outputs/a01/replay-*`. Each run preserves previous output and uses its own
local SQLite store. Automated grants are labeled `fixture_surrogate`.

To prepare a Case for your own exact approval, run
`node --experimental-strip-types scripts/a01-case.mjs prepare` and open the
printed preview. Preparing a Case executes no rollback. The preview gives
the exact approval command; `inspect`, `resume`, `pause`, and `unpause` use
the same printed Case directory. No paid model or hosted database is needed.

Start with [current direction](docs/hiring-mvp-direction.md) and
[factory status](factory/CONTEXT.md). Existing local regression commands are
`node scripts/run-golden-case-replay.mjs` and
`node scripts/run-case-scenario-matrix.mjs`. Their deterministic results do
not establish AI investigation quality or business recovery.

## Historical onboarding-rescue release

The description and cold-review instructions below belong to the prior
release, preserved at sealed commit `58b2aa0`. Its factory evidence is
[archived intact](_archive/2026-09-26-l14-before-a01/README.md). The current
A01 run is not shipped; historical stage commands require the sealed release
layout and should not be used to advance A01.

CrossSignal is a human control layer for consequential agent actions. Before
an agent can act, a person sees the exact proposed action, recipients, and
spending cap, authorizes that exact scope, and can pause all agent actions at
any time. CrossSignal then preserves an honest narrative of what happened and
what the action may—or may not—have caused.

## Current truth

This repository contains one evaluator-ready onboarding-rescue slice:

- an exact, immutable email intent for at most three recipients and a
  `$0.15` spending ceiling;
- human authorization bound to the displayed payload, context, policy, nonce,
  and expiry;
- a visible workspace-wide Global Pause checked before effect reservation;
- a reviewed planner → workers → skeptic → synthesizer playbook;
- a durable D1 narrative from evidence through execution and outcome; and
- explicit failed and indeterminate terminal states with no blind retry.

All demo evidence is **FIXTURE** data and all email effects use a **TEST**
adapter. The interface does not send live email, visually prove tenant
isolation, establish causal impact, or claim exactly-once delivery. The
confirmed outcome is labeled **Correlated, not proven**.

CrossSignal is a standalone portfolio project for the Result team, not a
claimed integration with Result's private infrastructure.

## Run the reviewer release

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run demo:prepare
npm run dev
```

Open `http://localhost:3000/`. If a completed trace is present, open
**Outcome** and choose **Reset exact FIXTURE trace for replay**.

Then follow the cold walkthrough and 90-second narrative in
[`historical DEMO_SCRIPT.md`](_archive/2026-09-26-l14-before-a01/factory/05_ship/output/DEMO_SCRIPT.md).
The release identity, truth manifest, architecture, threats, and complete proof
index are in
[`historical RELEASE_MANIFEST.md`](_archive/2026-09-26-l14-before-a01/factory/05_ship/output/RELEASE_MANIFEST.md).

## Start here

- Agent orientation and task routing: [`AGENTS.md`](AGENTS.md) then
  [`CONTEXT.md`](CONTEXT.md).
- Active `spec -> data -> build -> verify -> ship` factory:
  [`factory/CONTEXT.md`](factory/CONTEXT.md).
- Historical architecture snapshot:
  [`factory/_shared/ARCHITECTURE_SNAPSHOT.md`](factory/_shared/ARCHITECTURE_SNAPSHOT.md).
- Superseded CrossSignal plans and Phase 00 evidence:
  [`_archive/2026-08-12-crosssignal-phase-00/README.md`](_archive/2026-08-12-crosssignal-phase-00/README.md).

## Product commands

```bash
npm run demo:prepare
npm run dev
npm run build
npm run lint
npm test
npm run verify:release
npm run verify:ship
```

## Factory commands

```bash
npm run factory:status
npm run factory:seal
```

`factory:status` derives the active stage without writing a status table.
After the final human gate and commit, `factory:seal` confirms that the release
bindings cover the current product and that Git is clean.

The ICM/MWP factory authors and verifies the product. Application code,
database transactions, authorization, retries, and live tenant state remain in
the conventional product runtime.
