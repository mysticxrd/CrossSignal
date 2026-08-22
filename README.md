# Company Flight Recorder

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
[`factory/05_ship/output/DEMO_SCRIPT.md`](factory/05_ship/output/DEMO_SCRIPT.md).
The release identity, truth manifest, architecture, threats, and complete proof
index are in
[`factory/05_ship/output/RELEASE_MANIFEST.md`](factory/05_ship/output/RELEASE_MANIFEST.md).

## Start here

- Agent orientation and task routing: [`AGENTS.md`](AGENTS.md) then
  [`CONTEXT.md`](CONTEXT.md).
- Active `spec -> data -> build -> verify -> ship` factory:
  [`factory/CONTEXT.md`](factory/CONTEXT.md).
- Current architecture snapshot:
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
