---
type: verification-report
stage: 04
status: ready-for-review
verified_at: 2026-08-17T12:25:01.0905373+05:30
trace_id: trace_d12fc25947ed88cd
truth_mode: FIXTURE
effect_mode: TEST
---

# CrossSignal release verification report

Stage 04 resolves the eight Spec acceptance criteria for the accepted Build.
The verified product promise is control before action, control during
operation, and an honest narrative afterward. This report opens the Verify
human gate; it does not accept that gate or authorize Stage 05.

## Verified story

A signed-in Atlas Foundry owner reviewed an exact TEST email, its three
recipients, and its `$0.15` spending ceiling before an effect could be
reserved. Global Pause disabled authorization and caused the server-side
reservation path to fail closed until the owner resumed actions. Editing the
subject created immutable Intent v2 and invalidated authority over Intent v1.

The browser then exercised both consequential result branches:

1. An ambiguous provider response became `INDETERMINATE · NO RETRY`, exposed
   `fixture_provider_timeout_after_dispatch`, stopped execution, and produced
   no business-outcome claim.
2. After an exact FIXTURE reset, a fresh Intent v2 and fresh human grant
   produced one confirmed TEST effect. The narrative ended with one recorded
   observation labeled `Correlated, not proven`.

Reloading the application reconstructed the same confirmed Intent v2,
authorization record, effect result, subject, and trace from D1. Browser
warning/error logs were empty. All observed GET and server-action POST
requests returned HTTP 200.

## Acceptance matrix

| Criterion | Resolution | Evidence |
|---|---|---|
| `AC-01` | Passed | Release test reconstructs one `trace_id` across context, graph artifacts, intent, policy, grant, attempt, observation, and assessment. Browser screenshot `05` presents the same chain in human order. |
| `AC-02` | Passed | Release test mutates payload, context, policy, recipients, nonce, tenant, replay state, expiry, and kill-switch state; every mutation is rejected. The browser edit created Intent v2 and made the prior intent ineligible for approval. |
| `AC-03` | Passed | D1 uniqueness guards admit one effect identity. Confirmed duplicates and any retry from `indeterminate` are rejected. Screenshots `02` and `03` show the ambiguous result, reason, and no-retry status. |
| `AC-04` | Passed | Fresh D1 tests insert two late assessments and an immutable supersession edge. The UI separates Observed, Correlated, and Proven; screenshot `04` includes cohort, metric, baseline, observation, limitations, and `CORRELATED, NOT PROVEN`. |
| `AC-05` | Passed | A fresh two-workspace six-migration D1 database rejects cross-workspace trace and foreign-actor references while `foreign_key_check` remains clean. This is written/database evidence; the single-user UI is not claimed as visual proof of tenant isolation. |
| `AC-06` | Passed | The deterministic recovery planner preserves succeeded/skipped nodes, resumes only incomplete nodes with stable identities, rejects input drift, and never reopens a failed node or effect. |
| `AC-07` | Passed | Fresh D1 and contract tests reject duplicate and out-of-order ingress, direct execution without authority, expired/replayed grants, denied or undeclared evidence, prompt-injection material, context leakage, and ambiguous-effect retry. Every tested path leaves a visible terminal reason. |
| `AC-08` | Passed | TEST/FIXTURE labels remain visible on the control, trace, and outcome views. Stage 03 instructions and the exact reset control let a fresh reviewer run the confirmed and ambiguous branches. The six Stage 04 screenshots are content-hash bound below. |

No acceptance criterion remains implied or deferred.

## Full-story boundary evidence

| Boundary | Probe | Result |
|---|---|---|
| Browser -> control UI | Review exact email, recipients, `$0.15` cap, truth labels, and Global Pause | Passed; authorization was disabled while paused. |
| Control UI -> server action | Create Intent v2, authorize an ambiguous TEST result, reset, then authorize a confirmed TEST result | Passed; each mutation completed as an HTTP 200 POST and rendered the resulting state. |
| Server action -> authority contract | Reseal intent and check membership, exact grant bindings, policy, recipients, nonce, expiry, cap, kill switch, and prior attempts | Passed in focused authority mutation/replay tests. |
| Authority contract -> D1 effect reservation | Reserve a unique TEST effect only after current exact authority | Passed; uniqueness and terminal-state transitions reject duplicates and blind retries. |
| D1 -> response UI | Reload after confirmed execution and navigate across control, narrative, and outcome | Passed; durable Intent v2, authorization, confirmed effect, trace, and correlated assessment were reconstructed. |

## Attack and recovery matrix

| Required class | Executed evidence | Result |
|---|---|---|
| Recovery | Stable graph-node identities, preserved completion, incomplete-only resume, input-drift rejection | Fail closed |
| Tenant isolation | Fresh two-workspace D1 cross-trace and foreign-actor insert attacks | Fail closed |
| Duplicate ingress | D1 unique ingress identity and duplicate insertion probe | Fail closed |
| Out-of-order events | Per-trace event sequence guard and out-of-order insertion probe | Fail closed |
| Injection | Denied-source and prompt-injection classification probes | Fail closed |
| Context leakage | Undeclared/secret evidence and context-manifest mutation probes | Fail closed |
| Authority mutation/replay | Exact-binding mutations, expiry, replay, kill switch, tenant mismatch, direct execution | Fail closed |
| Ambiguous effects | `indeterminate` is terminal, visible, and cannot transition back to dispatching | Fail closed; no retry |
| Late outcomes | Two immutable assessments with one explicit immutable supersession edge | Preserved honestly |

The accepted Stage 02 record documents 14 tenant-isolation/security attack
probes against its pre-Build data package. Stage 04 does not present that
historical number as a new run. Instead, it independently executes the current
attack classes above against fresh databases and the built contracts.

## Browser evidence

All images are full-page captures from the local Chromium preview at
`http://localhost:3000/`.

| # | Evidence | SHA-256 |
|---:|---|---|
| `01` | `screenshots/01-global-pause.png` — paused workspace, exact proposal still visible, authorization disabled | `4307e0b8ef7f26c3104a473b5467fc406bd34d969008d013797e823885e3d6eb` |
| `02` | `screenshots/02-indeterminate-trace.png` — readable narrative ending in indeterminate execution and no outcome claim | `ab316afe01e83973de98edc74bcfa6ff1166141ba39020aa6612d0172026a4f7` |
| `03` | `screenshots/03-indeterminate-control.png` — explicit provider timeout reason and `NO RETRY` | `c416a35281f156f6c7a2957f92e82ba86a6eb96fc09628e41c1d2842ff5cfe8d` |
| `04` | `screenshots/04-correlated-not-proven.png` — observed metric, cohort, limitations, and calibrated claim | `bb188bbc5278052e3cacae56b074e36ba2e97c3f794ecec3e34355c2813b9d04` |
| `05` | `screenshots/05-golden-narrative-trace.png` — evidence -> skeptic -> proposal -> authorization -> execution -> outcome | `def55f9a702866d623be864508c90de334f0442f415c4f7974dccd997599c8d2` |
| `06` | `screenshots/06-golden-authorization.png` — persisted exact authorization record beside Global Pause and reviewed playbook | `980a7c1195fe89ec8ba573fbd413eaa658604d46eaff0bf9781399b91741c278` |

Technical hashes, IDs, evidence, policy, expiry, and trace provenance remain
available through `View technical proof`, per-stage `View details`, and
`Inspect trace proof` disclosures. They do not displace the human decision.

## Defects found and fixed in Verify

1. Recovery had durable graph identities but no directly testable resume
   planner. `planReasoningRecovery` now preserves completed nodes, resumes only
   incomplete nodes, rejects input drift/duplicates, and blocks failed nodes.
2. Late-outcome and tenant tests previously leaned on structural assertions.
   Stage 04 now materializes a fresh six-migration D1 database, inserts real
   late assessments and supersession, and attacks cross-workspace references.
3. The Stage 02 verifier correctly rejects the post-Build `db/` tree as a
   stale Data-package input. Stage 04 did not weaken or rewrite that accepted
   historical gate; `verify:release` owns current-product checks instead.

## Residual risk and honest limits

- This is a local, single-user FIXTURE UI with a TEST effect adapter. It does
  not send live email, prove production provider behavior, or visually prove
  tenant isolation.
- Tenant isolation is supported by composite D1 references and fresh
  two-workspace attacks. Production-scale concurrency, distributed delivery,
  and vendor failure modes remain outside this slice.
- The accepted Stage 02 14-probe result is historical evidence bound to the
  pre-Build data tree. Stage 04 verifies the current eight required attack
  classes but does not claim it reran that historical harness unchanged.
- One confirmed fixture observation is correlated in a three-recipient cohort.
  It is not causal proof and cannot support a production efficacy claim.
- No automatic retry is implemented for failed or indeterminate effects. A
  later action requires an explicit new intent and human authorization.

## Declared input bindings

Text hashes normalize line endings to LF before SHA-256.

| Input | SHA-256 |
|---|---|
| `../CONTEXT.md` | `1160aeb04b78a93e4c31d6a2ac06043ff4317842e528481bbbb1ba31642782e0` |
| `../../01_spec/output/SPEC.md` | `bcbe3dbffe2471617e48cda0f2b2cbf9cea00ef6a60f943ce827077ad8cd27e8` |
| `../../02_data/output/DATA_PACKAGE.md` | `bc63fbcec2cfb8ba70cf8286dbb2f8cbca2f02272b9b07b1eea918b6072e32b0` |
| `../../03_build/output/BUILD_EVIDENCE.md` | `9b5b07c376e2ffe44d9015ae500ae597c6e5e68a77818d1196bf29aa013eae34` |
| `../../03_build/output/VERIFY.md` | `1b9ab1d931f9154186a1ebf97a79639dd8442040fd2dbb3545b10408dc3ca0a0` |
| `../../03_build/output/HUMAN_GATE.md` | `ebae846ebe366ac36fcd7372dd8e206fbb7ab5e49f2324c56d1ee8ba04b2feb9` |
| `../../_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `../../_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `../../../tests/` | `b4220fc7d11f337ab6c16cb0e1bc78d11e01473fbd06e935185eb9d7348f7dba` |

## Implementation bindings

| Artifact | SHA-256 |
|---|---|
| `../../../app/CrossSignalApp.tsx` | `f764416effea5014bee700dd42e8368bc2e1ce73d80da9b0dac4098a9998f501` |
| `../../../app/flight-recorder-actions.ts` | `3823f5b3487147b4a9a3f9c691cefed1fb93206527a81e1b229606899fc085c3` |
| `../../../db/flight-recorder.ts` | `41f248e8e6bc0134552ff75b20f3f8f31f079bb319c05e6af5a28d5a722b70f7` |
| `../../../db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `../../../tests/flight-recorder-release.test.mjs` | `65d341700d5378e79be376656ee0a8380108c3891ff560ea5ae912985ddc1e8c` |
