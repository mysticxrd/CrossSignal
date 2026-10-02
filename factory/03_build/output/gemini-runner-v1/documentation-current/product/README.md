# CrossSignal — Revenue Leak Investigator

This is the authoritative product checkout at
`C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1`. The current milestone
is **B01 API behavioral benchmark**: five causally different simulated cases,
rules/single-shot/tool-model comparisons, failure analysis and one measured
change. Read the [current charter](docs/api-benchmark-charter.md),
[planning reconciliation](docs/benchmark-planning-reconciliation.md) and
[API execution boundary](docs/api-execution-boundary.md). No local-model setup
is needed. Provider selection and execution conditions follow the current
stage contract, rather than the older planning headers. The October 2 review
found Gemini preparation selected, conditional verified-free-tier requests
recorded, and account/route prerequisites unverified. No paid fallback is allowed.

The A01 → B01 transition is [confirmed](factory/TRANSITION.md). On October 2,
`factory/status.mjs` reported B01 Stage 01 Spec and Stage 02 Data accepted and
fresh, Stage 03 Build in progress with an incomplete gate, and Stages 04–05
never run. [Build verification](factory/03_build/output/VERIFY.md) reports
offline preparation passed but full Build blocked;
[Build human acceptance](factory/03_build/output/HUMAN_GATE.md) remains pending.
This is a dated observation, not an editable state machine. The working tree
is intentionally uncommitted and unsealed. Derive fresh status from this checkout
before every resume; the outer repository's factory is historical:

```powershell
node factory/status.mjs
```

Model evaluation and actual human runtime approval remain **NOT_RUN**. Stage
acceptance never grants runtime intervention authority. Open the parent
[`CrossSignal.code-workspace`](../../CrossSignal.code-workspace) for focused
development and the [cleanup manifest](../../planning/2026-10-01-workspace-cleanup/MANIFEST.md).
The ICM architecture uses thin entry guidance, this router, the derived active
stage, its declared inputs and two named shared references. Product runtime
state stays in the application/database; archives and planning candidates are
historical references loaded only for an explicit task. Accepted documents can
retain older pending-stage or local-model wording; the manifest reconciles those
dated statements without rewriting their hashes.

## Preserved A01 local mechanics baseline

A01 is sealed at `43d42d255bd22cb227e3410dda31ffb8437f6624`. Its five accepted
stages prove local deterministic mechanics, not five-case model diagnosis quality
or hiring-MVP completion. Complete factory evidence is preserved under
`_archive/2026-09-30-a01-before-b01/`:
[Spec](_archive/2026-09-30-a01-before-b01/factory/01_spec/output/SPEC.md),
[Data package](_archive/2026-09-30-a01-before-b01/factory/02_data/output/DATA_PACKAGE.md),
[Build](_archive/2026-09-30-a01-before-b01/factory/03_build/output/BUILD_EVIDENCE.md),
[Verification](_archive/2026-09-30-a01-before-b01/factory/04_verify/output/VERIFICATION_REPORT.md),
[release manifest](_archive/2026-09-30-a01-before-b01/factory/05_ship/output/RELEASE_MANIFEST.md)
and [cold demo](_archive/2026-09-30-a01-before-b01/factory/05_ship/output/DEMO_SCRIPT.md).
The [A01 checkpoint](docs/a01-release-status.md) retains its historical source text.

## Local A01 Case commands

These commands create new stored results or prepare runtime proposals; they are
reference instructions and are not required for workspace cleanup. Existing
`outputs/a01/` Cases, databases, approval state and history must be preserved.

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

The [hiring direction](docs/hiring-mvp-direction.md) is historical; current work
starts with [CONTEXT.md](CONTEXT.md) and [factory status](factory/CONTEXT.md).
Existing local regression commands are
`node scripts/run-golden-case-replay.mjs` and
`node scripts/run-case-scenario-matrix.mjs`. Their deterministic results do
not establish AI investigation quality or business recovery.

## Historical onboarding-rescue release

The description and cold-review instructions below belong to the prior
release, preserved at sealed commit `58b2aa0`. Its factory evidence is
[archived intact](_archive/2026-09-26-l14-before-a01/README.md). The current
B01 stage is derived from `factory/status.mjs`; historical stage commands
require the sealed release layout and should not be used to advance B01. Use the historical checkout
for the reviewer commands below; the active B01 factory has no Stage 05 prepare script.

CrossSignal is a human control layer for consequential agent actions. Before
an agent can act, a person sees the exact proposed action, recipients, and
spending cap, authorizes that exact scope, and can pause all agent actions at
any time. CrossSignal then preserves an honest narrative of what happened and
what the action may—or may not—have caused.

## Historical onboarding-rescue truth

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

## Historical reviewer release commands

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

## Historical product commands

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
