---
type: release-manifest
stage: 05
status: ready-for-review
release_id: crosssignal-onboarding-rescue-evaluator-v1
version: 0.1.0
trace_id: trace_d12fc25947ed88cd
truth_mode: FIXTURE
effect_mode: TEST
---

# CrossSignal evaluator release

CrossSignal is a human control layer for consequential agent actions.

> Before an agent can take a consequential action, a person sees the exact
> proposed action, approves its scope and cost, and can stop the system at any
> time. CrossSignal then preserves an honest account of what happened and what
> it may—or may not—have caused.

This portable release packages the accepted onboarding-rescue proof. It is not
a production launch, a live-email integration, or authorization to advance
beyond the Stage 05 Ship human gate.

## Release identity

| Field | Value |
|---|---|
| Release | `crosssignal-onboarding-rescue-evaluator-v1` |
| Version | `0.1.0` |
| Golden trace | `trace_d12fc25947ed88cd` |
| Product surface | Authenticated local Vinext application |
| Data mode | `FIXTURE` |
| Effect mode | `TEST` email adapter |
| Accepted upstream gate | Stage 04 Verify, accepted 2026-08-20 |
| Intended reviewer | A fresh evaluator running the repository locally |

## Truth manifest

| Claim surface | What this release honestly establishes | What it does not establish |
|---|---|---|
| Human control | Exact recipients, content, `$0.15` cap, context, policy, nonce, and expiry are bound before one effect reservation. | Approval is not delegated to a model. |
| Global Pause | A visible workspace-wide control blocks new effect reservations and is rechecked server-side. | It is not presented as a production incident-management system. |
| Execution | A deterministic TEST adapter records confirmed, failed, or indeterminate results. | No live email is sent and no production provider reliability is claimed. |
| Failure | Failed and indeterminate attempts remain visible and terminal; there is no blind or silent retry. | Exactly-once delivery is not claimed. |
| Outcome | One FIXTURE observation is labeled Correlated, not proven. | No causal or production efficacy claim is made. |
| Tenancy | Fresh two-workspace D1 attacks and composite references provide written verification evidence. | The single-user UI does not visually prove tenant isolation. |
| Playbook | Planner → workers → skeptic → synthesizer is a reviewed, inspectable onboarding-rescue playbook. | It is not a generic DAG engine or arbitrary agent swarm. |
| Result relationship | CrossSignal is a standalone portfolio project for the Result team. | No endorsement, commission, private API, or integration is claimed. |

No public Result product claim is needed for the demo narrative. The release
does not depend on temporally unstable public evidence.

## Architecture

```text
authenticated owner
  -> exact action-control UI + Global Pause
  -> authenticated server action
  -> deterministic authority reseal and policy checks
  -> workspace-bound D1 effect reservation
  -> deterministic TEST adapter
  -> append-only execution event
  -> FIXTURE observation and calibrated assessment
  -> readable narrative with technical proof on disclosure
```

The runtime source of truth is D1. The UI does not create authority, choose a
tenant, or infer a provider result. One `trace_id` connects evidence, reviewed
playbook artifacts, the immutable intent, human grant, effect attempt,
observation, and assessment.

## Threat model

| Threat | Release response | Proof |
|---|---|---|
| Payload, recipient, cap, context, or policy mutation | Creates a new intent or fails exact resealing; an old grant cannot execute. | `AC-02` release tests |
| Direct execution, expiry, replay, or tenant drift | Server-derived authority fails closed before reservation. | `AC-02` / `AC-07` |
| Duplicate ingress or out-of-order event | D1 uniqueness and event-order guards reject the write. | `AC-03` / `AC-07` |
| Prompt injection or undeclared/secret context | Source and manifest validators reject it. | `AC-07` |
| Interruption | Completed stable nodes remain; only incomplete nodes resume. | `AC-06` |
| Possible dispatch followed by timeout | Attempt becomes `indeterminate` and cannot re-enter dispatch. | `AC-03` and browser failure replay |
| Late outcome | A new assessment appends and explicitly supersedes; history is not rewritten. | `AC-04` |
| Cross-workspace reference | Composite D1 references reject the relationship. | `AC-05` |

## Cold setup

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run demo:prepare
npm run dev
```

Open `http://localhost:3000/`. The migration command uses the checked-in D1
lineage and a project-local database. It does not contact a live email provider.

If the screen contains a completed result, choose **Outcome** then
**Reset exact FIXTURE trace for replay**. The reset deletes only the labeled
FIXTURE trace and preserves workspace membership and Global Pause state.

Follow [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) without oral corrections. A cold
reviewer must be able to pause/resume, create Intent v2, authorize the timeout
case, inspect `INDETERMINATE · NO RETRY`, reset, authorize the confirmed case,
and inspect `Correlated, not proven`.

## Proof index

| Question | Primary proof |
|---|---|
| What behavior was accepted? | [Specification](../../01_spec/output/SPEC.md) |
| What was built and how is it reset? | [Build Evidence](../../03_build/output/BUILD_EVIDENCE.md) |
| Did every acceptance criterion pass? | [Verification Report](../../04_verify/output/VERIFICATION_REPORT.md) |
| What commands and tests passed? | [Stage 04 Verify](../../04_verify/output/VERIFY.md) |
| Was Verify accepted by a person? | [Accepted Stage 04 gate](../../04_verify/output/HUMAN_GATE.md) |
| Where is the exact paused proposal? | [Global Pause evidence](../../04_verify/output/screenshots/01-global-pause.png) |
| Where is the ambiguous no-retry result? | [Indeterminate control evidence](../../04_verify/output/screenshots/03-indeterminate-control.png) |
| Where is claim calibration visible? | [Correlated-not-proven evidence](../../04_verify/output/screenshots/04-correlated-not-proven.png) |
| Where is the readable story? | [Golden narrative evidence](../../04_verify/output/screenshots/05-golden-narrative-trace.png) |
| Where is the persisted exact authorization? | [Golden authorization evidence](../../04_verify/output/screenshots/06-golden-authorization.png) |
| How does a new reviewer run it? | [Cold walkthrough and 90-second narrative](DEMO_SCRIPT.md) |
| Which release checks are executable? | [Ship tests](../../../tests/flight-recorder-ship.test.mjs) and [ship verifier](../verify.mjs) |
| How is factory state checked and sealed? | `npm run factory:status` derives state; `npm run factory:seal` fails closed until the accepted release is committed and clean. |

## Cold reviewer evidence

On 2026-08-20, the release was run from `npm run demo:prepare` and the written
script in a new browser tab. Page loads and server actions returned HTTP 200,
browser warning/error logs were empty, and reload reconstructed the confirmed
authorization and effect from D1.

| # | Evidence | SHA-256 |
|---:|---|---|
| `01` | [`screenshots/01-cold-reset-ready.png`](screenshots/01-cold-reset-ready.png) — exact pending proposal after the narrow reset | `c74ee2a178f65de1f518ccbfb1685d610056d872725c1dc9778a6ed9a38f9d50` |
| `02` | [`screenshots/02-cold-indeterminate-no-retry.png`](screenshots/02-cold-indeterminate-no-retry.png) — authorized Intent v2 with ambiguous provider result and no retry | `bafc6713a3526fbb355bc23617fc205d57f8df910dc9fbdd75746d8edb8d03ed` |
| `03` | [`screenshots/03-cold-correlated-outcome.png`](screenshots/03-cold-correlated-outcome.png) — Observed and Correlated separated from Proven | `9f38969c3d4ccccec6d8c3bfdc1b14b6a5c4ccd814f1e8b1215f1938cb175cab` |
| `04` | [`screenshots/04-cold-golden-trace-proof.png`](screenshots/04-cold-golden-trace-proof.png) — narrative trace with evidence provenance disclosed | `21287fb46896d17b7cef5ef8ffb814b56d9e8348f7eb92564fff80dcc3734bff` |
| `05` | [`screenshots/05-cold-persisted-authorization.png`](screenshots/05-cold-persisted-authorization.png) — confirmed exact authorization reconstructed after reload | `6fe850d1ab5df76d94e343a7bd6c3e9dd86cb9d6ac13bab8312d8bb4b051544b` |

## Residual limits

- The release is local, single-owner, and evaluator-oriented. FIXTURE and TEST
  labels are evidence boundaries, not placeholders for an implied live system.
- The written database attacks establish tenant controls for this schema; a
  single-user screen cannot visually establish cross-tenant isolation.
- The accepted Stage 02 record contains 14 historical Data-stage probes. Stage
  04 independently ran the eight current attack classes; this release does not
  conflate those two results.
- A three-recipient FIXTURE outcome cannot prove causality, production
  efficacy, scale, distributed consistency, or vendor reliability.
- Indeterminate and failed effects have no automatic retry. A later attempt
  requires reconciliation or a new intent and exact human authorization.
- The release does not claim knowledge of Result's private stack, APIs,
  topology, security model, roadmap, or hiring rubric.

## Declared input bindings

Text hashes normalize line endings to LF before SHA-256.

| Input | SHA-256 |
|---|---|
| `factory/05_ship/CONTEXT.md` | `b49aaafea9c8c6b44b064f365ae6af966182d82f38ab227a228b9eaccd6ff18e` |
| `factory/01_spec/output/SPEC.md` | `bcbe3dbffe2471617e48cda0f2b2cbf9cea00ef6a60f943ce827077ad8cd27e8` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `8e42bd7e5030b8f1985c6fbfa2efcf0549d7ecb4e711f04e48a018f7e5514852` |
| `factory/04_verify/output/VERIFY.md` | `a78b03d777bed74a9cba48510a320ff4b7ab50ae1747e5c0df7ebd8a8ca1d252` |
| `factory/04_verify/output/HUMAN_GATE.md` | `956e31766c0fdde72721a379009fbb32871e85bbe65314fed76f8831e168cfaa` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `9b5b07c376e2ffe44d9015ae500ae597c6e5e68a77818d1196bf29aa013eae34` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `README.md` | `7e140c6ebeb75777e9302af506d710ff74444633b5fa2744f61553ec959bf192` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `app/` | `9865c5d5340a0e639331eeb16156328553383d6636a1935b169885ad8eb6ec43` |
| `db/` | `9411819a56d862bf0f439d7da05b668497f6ce90c96b7053d1f5ebcd8f4e60da` |
| `drizzle/` | `39786e0012f0e21742ab5a18ac71cdd7c901f612782e4722f568c402abf25cd5` |
| `tests/` | `39d05dcc77eae230013775c1d230340d8937a63f9b5e876fc0a99b053c2102dd` |
