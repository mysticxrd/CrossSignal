# CrossSignal workspace — product entry and historical repository

The authoritative CrossSignal product checkout is
[`work/crosssignal-phase1`](work/crosssignal-phase1/README.md). Open
[`CrossSignal.code-workspace`](CrossSignal.code-workspace) for product development
and the [workspace cleanup review](planning/2026-10-01-workspace-cleanup/MANIFEST.md).
The project root is `C:/Users/hisha/ChatGPT/CrossSignal`; the active product is
the separate Git repository at
`C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1`. This outer
repository retains historical application source, its earlier factory and
planning/evidence packets. It is not a second execution state for the product.
Use the active product's [task router](work/crosssignal-phase1/CONTEXT.md), then
derive its current factory state before resuming work:

```powershell
Set-Location C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1
node factory/status.mjs
```

The October 2 clarity review observed accepted/fresh B01 Spec and Data, Stage
03 Build in progress with an incomplete gate, and an unsealed release. This is
a dated observation; the command above governs each resume. No model evaluation
or exact human runtime intervention has run. The current Build contract records
Gemini preparation and conditional $0 request authority, with account/route
prerequisites still unverified; this cleanup authorizes no requests.

The outer [CONTEXT.md](CONTEXT.md) retains protected historical routing text
because the accepted B01 Spec verifier asserts its exact raw hash. Follow P's
router for current work and review the
[exact outer-router proposal](planning/2026-10-01-workspace-cleanup/ENTRY_ROUTER_PROPOSAL.md)
before any source/binding correction. Preserve both repositories, accepted
snapshots and all existing uncommitted work. The release instructions below
describe this outer repository's historical onboarding-rescue implementation.

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
[`factory/05_ship/output/DEMO_SCRIPT.md`](factory/05_ship/output/DEMO_SCRIPT.md).
The release identity, truth manifest, architecture, threats, and complete proof
index are in
[`factory/05_ship/output/RELEASE_MANIFEST.md`](factory/05_ship/output/RELEASE_MANIFEST.md).

## Start here

- Agent orientation and task routing: [`AGENTS.md`](AGENTS.md) then
  [`CONTEXT.md`](CONTEXT.md).
- Active product factory and derived status:
  [`work/crosssignal-phase1/factory/CONTEXT.md`](work/crosssignal-phase1/factory/CONTEXT.md).
- Outer historical factory:
  [`factory/CONTEXT.md`](factory/CONTEXT.md).
- Outer historical architecture snapshot:
  [`factory/_shared/ARCHITECTURE_SNAPSHOT.md`](factory/_shared/ARCHITECTURE_SNAPSHOT.md).
- Superseded CrossSignal plans and Phase 00 evidence:
  [`_archive/2026-08-12-crosssignal-phase-00/README.md`](_archive/2026-08-12-crosssignal-phase-00/README.md).

## Historical outer product commands

```bash
npm run demo:prepare
npm run dev
npm run build
npm run lint
npm test
npm run verify:release
npm run verify:ship
```

## Historical outer factory commands

```bash
npm run factory:status
npm run factory:seal
```

In this outer repository these commands describe its historical run. Derive
the active product state with the P command at the top of this README.
`factory:status` derives a repository's stage without writing a status table.
After the final human gate and commit, `factory:seal` confirms that the release
bindings cover the current product and that Git is clean.

The ICM/MWP factory authors and verifies the product. Application code,
database transactions, authorization, retries, and live tenant state remain in
the conventional product runtime.
