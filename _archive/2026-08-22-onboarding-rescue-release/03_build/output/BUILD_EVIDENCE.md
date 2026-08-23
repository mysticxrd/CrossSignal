---
type: stage-output
stage: 03
status: ready-for-review
project: CrossSignal
slice: onboarding-rescue
trace_id: trace_d12fc25947ed88cd
truth_mode: FIXTURE
effect_mode: TEST
---

# CrossSignal control-first build evidence

Stage 03 closes one durable onboarding-rescue loop around a human decision:
the exact proposed TEST email, all three recipients, and the `$0.15` hard
spending ceiling are visible before an owner can authorize an effect. The
workspace-wide Global Pause remains adjacent to that decision and is rechecked
server-side immediately before effect reservation.

This evidence is ready for the Build human gate. It does not accept the gate or
advance the factory to Stage 04.

## Reviewer preview

- Local URL: `http://localhost:3000/`
- Replayable trace: `trace_d12fc25947ed88cd`
- Final captured state: confirmed TEST effect from edited immutable Intent v2,
  followed by one FIXTURE observation labeled `correlated, not proven`.
- Cold local preparation:
  `npx wrangler d1 migrations apply DB --local --config factory/02_data/wrangler.verify.jsonc`
  followed by `npm run dev`.
- The preview database ID in `vite.config.ts` is intentionally identical to the
  accepted Data verifier's local placeholder, so the preview consumes the same
  checked-in migration lineage rather than creating runtime schema.

For the required human-gate run, choose **Reset exact FIXTURE trace for
replay**, engage and resume **Global Pause**, select **Edit proposed action**,
change the subject, body, or recipients, save the new intent, inspect the new
intent version, and only then select **Authorize exact action**. The current
captured replay proves this path with Intent v2.

## Visible product evidence

| Priority | Browser-observed evidence |
|---|---|
| Exact human authorization | The central card asks: “Send this email to these 3 people. Cost is capped at $0.15. Do you authorize this action?” It shows the exact subject, body, recipients, and TEST adapter before authorization. |
| Mutation needs a new decision | Editing the subject created immutable Intent v2. No approval carried from v1, and authorization was available only for the revised display. |
| Recipient and spend controls | The UI shows `3 of 3 max`; the policy-bound ceiling is `$0.15`. Server-side resealing and authority validation bind both to the approved payload. |
| Visible kill switch | Global Pause disabled the authorization control and stated that every new effect reservation would be rejected. Resume restored proposals without bypassing exact approval. |
| Honest execution | Confirmed and rejected TEST-provider paths were exercised. The rejected path displayed `FAILED`, the reason, `no retry was attempted`, and `No business outcome is claimed.` |
| Readable narrative | The trace reads evidence used → skeptic review → proposed action → human authorization → execution result → observed business outcome. Hashes and identifiers remain behind details disclosures. |
| Calibrated claims | Outcome presents Observed, Correlated, and Proven separately; the captured result is prominently `CORRELATED, NOT PROVEN`, with `NO CLAIM` under Proven. |
| Reviewed playbook | Planner, quantitative worker, qualitative worker, experiment worker, skeptic, and synthesizer appear as the defined onboarding-rescue operational playbook and its known safety boundary. |

## Screenshots

| Evidence | Artifact | SHA-256 |
|---|---|---|
| Edited Intent v2 awaiting exact authorization, with Global Pause, recipients, cap, email, and reviewed playbook visible | [`screenshots/01-exact-authorization.png`](screenshots/01-exact-authorization.png) | `26c202e320d4ae264075a57256dfb35985933994e21e892149617293267531cb` |
| Observed / Correlated / Proven separation | [`screenshots/02-calibrated-outcome.png`](screenshots/02-calibrated-outcome.png) | `3e5d0f20861d70eb7fd752bca801790cc3f909d516fc4e95dd94308ff9cdbc4d` |
| Human-readable confirmed narrative trace | [`screenshots/03-narrative-trace.png`](screenshots/03-narrative-trace.png) | `1155475559d6becf840241cb05d1c616816b0025f51c47b4c25c53f8b9375375` |
| Rejected provider path with failure, no outcome claim, and no retry | [`screenshots/04-failure-no-retry.png`](screenshots/04-failure-no-retry.png) | `e9df854302fd924fcac60ad53f858781db0d8b116f795968812107c890ee6019` |

## Durable artifact chain

All runtime surfaces are reconstructed from workspace-bound D1 records under
one `trace_id`, not from a static UI fixture object.

1. Five versioned FIXTURE evidence records are frozen into one ordered context
   manifest.
2. The six reviewed playbook nodes persist bounded artifacts and evidence
   citations; hidden chain-of-thought is not stored.
3. An immutable TEST action intent binds recipients, subject, body, context,
   policy, nonce, expiry, cohort cap, and spend ceiling.
4. An owner-authenticated server action derives membership and workspace,
   reseals the stored intent, rechecks Global Pause, and creates an exact,
   one-time approval grant.
5. One unique effect attempt is reserved before TEST dispatch. Confirmed,
   failed, and post-dispatch indeterminate states are terminal in this slice;
   no silent retry path exists.
6. Only a confirmed effect produces the labeled FIXTURE observation and
   correlated assessment. Failed execution creates no observation and no
   success claim.

Key implementation artifacts:

- `app/CrossSignalApp.tsx` — control-first authorization, pause, narrative, and
  outcome surfaces.
- `app/flight-recorder-actions.ts` — authenticated server actions.
- `db/flight-recorder.ts` — workspace-bound repository, authority checks,
  effect reservation, result events, outcome persistence, and exact reset.
- `db/flight-recorder-demo.ts` — deterministic pending FIXTURE builder.
- `tests/flight-recorder-build.test.mjs` — six focused Build contract tests.
- `factory/03_build/verify.mjs` — accepted-input and Build verifier.

## Browser probe record

On 2026-08-13 in the in-app Chromium preview:

- workspace creation returned the control-first screen;
- Global Pause made **Authorize exact action** disabled; Resume restored it;
- subject editing created Intent v2 and did not create a grant or effect;
- exact authorization produced a confirmed TEST receipt and one correlated
  FIXTURE observation;
- reset plus `Provider rejects` produced a failed trace, visible reason, no
  retry, and no outcome claim;
- a final reset/edit/authorize run left `trace_d12fc25947ed88cd` in the
  confirmed, assessed Intent v2 state for review;
- the dev terminal recorded successful `GET` and `POST` responses with no
  runtime exception during the exercised flow.

## Truth boundary and limits

- This is a local, single-workspace, single-owner evaluator slice using
  FIXTURE evidence, a TEST email adapter, and a compressed FIXTURE outcome. It
  does not send live email or claim a production connector.
- The observed activation follows the TEST action, but this does not establish
  causality. `Proven` is explicitly not claimed.
- Stage 02's written verification proves 14 tenant-isolation and security
  attacks against a fresh D1. This single-user UI does not visually prove
  tenant isolation, and the product copy says so.
- The fixed graph is one reviewed onboarding-rescue playbook with known safety
  boundaries, not a generic arbitrary DAG or an agent swarm.
- A provider timeout after dispatch is recorded as indeterminate and is not
  retried. Reconciliation or a new intent and authorization remains outside
  this bounded Stage 03 interaction.
- No remote database, live provider, or Stage 04 artifact was created.

## Declared input hashes

Text is normalized to LF before SHA-256. Directory hashes are SHA-256 over
sorted `repository-relative-path NUL file-sha256 LF` entries.

| Declared Stage 03 input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `d5e769eeb6aed5d1c709e2859812e0f4f05469c1a780c727a5c5f5e0848aebb5` |
| `factory/01_spec/output/SPEC.md` | `bcbe3dbffe2471617e48cda0f2b2cbf9cea00ef6a60f943ce827077ad8cd27e8` |
| `factory/02_data/output/DATA_PACKAGE.md` | `bc63fbcec2cfb8ba70cf8286dbb2f8cbca2f02272b9b07b1eea918b6072e32b0` |
| `factory/02_data/output/VERIFY.md` | `d800abb18d671def25d88655b1898f15fda60daab6f34a44758315999befa129` |
| `factory/02_data/output/HUMAN_GATE.md` | `1715a8ded7e45e4d7eb6cb0218eda13385d01139ad2367e0d7c04ec07b7a6eeb` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `app/` | `25bfc928e6b5f2ea2d8780f909f075f1b4767d3864c5125e6b647c8dc5bbb974` |
| `db/` | `1f861da11f22a31aa258ddb4417fd565f7a5b7a75eb8fae7cd40cd3d758da6f6` |
| `drizzle/` | `90af42a4c3d23d9722debcc000907483512061a9d055ce67e4dff7d9e643279b` |
| `worker/` | `8e9098389533594afeb27c533357aa71ca2a2eca189b409a1f55affb4981b568` |
| `tests/` | `7a4a3f94f415b4424b59b0780bdf30d589ea3aa42d14ad6356fa024368bf0ead` |
