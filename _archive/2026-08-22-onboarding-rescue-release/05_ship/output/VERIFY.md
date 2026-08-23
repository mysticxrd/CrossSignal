---
type: verification
stage: 05
status: passed
verified_at: 2026-08-22T13:13:26.5126108+05:30
---

# Stage 05 verification

The accepted Verify evidence is packaged as a portable, cold-reviewable
FIXTURE/TEST release. Verification opens the Ship human gate; it does not
accept it.

## Artifact bindings

Text hashes normalize line endings to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `RELEASE_MANIFEST.md` | `a5753d82a73c644c9362c83f0e79ec32578e639d4bff775a4deef264697d20f0` |
| `DEMO_SCRIPT.md` | `a13a3dec87df61d8babf36aefb5813961a509d89dab282c771a037f88a802b62` |
| `../verify.mjs` | `a6fde0bf21c8898f98e85d7e73f6cc828c8d98e0c3540ecb2a1dc4738953990a` |
| `../prepare.mjs` | `9bdfb7a637e7ed121aa1dd0cf139f5121969504096637e50f6bd0a115cb6e645` |
| `../../../README.md` | `7e140c6ebeb75777e9302af506d710ff74444633b5fa2744f61553ec959bf192` |
| `../../../package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `../../../tests/flight-recorder-ship.test.mjs` | `9c500880b1237f28cdfeb3efd8f5b67d4db2644b951b9db709d42a1a48db2a11` |

The release manifest binds the accepted Stage 04 inputs, final handoff tree,
six upstream verification screenshots, and five new cold-review screenshots.

## Cold reviewer evidence

The verified story was:

> A fresh evaluator prepares the project-local D1 schema, opens the exact
> action-control UI, proves Global Pause blocks authorization, creates
> immutable Intent v2, observes an indeterminate TEST result with no retry or
> outcome claim, resets narrowly, authorizes one confirmed TEST effect, reads
> the narrative and correlated-not-proven outcome, then reloads the same
> durable authorization from D1.

The local browser emitted no warning or error logs. The dev server recorded
HTTP 200 for the page, server-action POSTs, and RSC refreshes throughout the
walkthrough.

## Defects found and fixed in Ship

1. The root README still described the pre-Build prototype. It now leads with
   human control, current release truth, exact cold setup, and explicit
   FIXTURE/TEST/non-causal limits.
2. A nested Windows `npm.cmd` invocation returned `EINVAL` in the first Ship
   verifier run. The verifier now invokes the accepted release checker through
   Node directly, removing shell-dependent nesting.
3. The first preparation wrapper did not unambiguously share the preview's D1
   persistence root and was not idempotent over an existing preview schema.
   `demo:prepare` now targets `.wrangler/state`, preflights required tables and
   guard triggers, applies migrations only when absent, and exits cleanly when
   the release schema is already healthy.
4. Lint found one unnecessary regex escape in the Ship verifier. The escape
   was removed and the complete lint/test matrix was rerun.
5. A post-gate workspace test correctly learned that all five stage outputs
   exist, but the Ship manifest still bound the earlier `tests/` tree. Factory
   status and seal commands are now executable from `package.json`, the README
   documents them, the current tests tree is rebound, and the main suite runs
   the three factory-tool tests. The first combined run exposed one incorrect
   assumption that a fresh release head implies an already accepted human
   gate; the assertion was corrected and the complete matrix passed.

## Command results

Environment: Windows PowerShell, Node.js `22.15.0`, Wrangler `4.92.0`,
Drizzle Kit `0.31.10`, Vinext `1.0.0-beta.2`, Vite `8.0.13`, and local
Chromium preview at `http://localhost:3000/`.

| Command / probe | Timestamp (+05:30) | Exit | Relevant result |
|---|---|---:|---|
| `npm.cmd run demo:prepare` | `2026-08-20T15:47` | `0` | Project-local D1 preflight found all required release tables and guards; idempotent rerun required no migration replay. |
| In-app Chromium cold reviewer run | `2026-08-20T15:48–15:53` | `0` | Reset, pause denial, Intent v2, indeterminate/no-retry, confirmed replay, trace disclosure, calibrated outcome, and reload persistence; GET/POST 200; no browser warning/error logs. |
| `npm.cmd run verify:ship` | `2026-08-22T13:06–13:13` | `0` | Accepted Verify gate; all eight acceptance criteria; `21/21` release tests; `5/5` Ship tests; six upstream and five cold-review screenshot bindings; refreshed release inputs matched. |
| `npm.cmd run build` | `2026-08-22T13:06–13:13` | `0` | Five Vinext environments built; dynamic `/` route emitted. |
| `npm.cmd run lint` | `2026-08-22T13:06–13:13` | `0` | Complete active-repository ESLint passed with no diagnostics. |
| `npm.cmd test` | `2026-08-22T13:06–13:13` | `0` | Production build plus all `41/41` tests passed; `0` failed, skipped, or cancelled after correcting the new factory-state assertion. |

## Residual truth boundary

- FIXTURE evidence and a TEST adapter remain explicit; no live email,
  production scale, exactly-once delivery, or causal impact is claimed.
- The single-user UI remains presentation evidence, not visual proof of tenant
  isolation. Database tests own that proof.
- Failed and indeterminate effects have no automatic retry. A later attempt
  requires reconciliation or a new exact intent and authorization.
- No public or private Result implementation claim is needed for the demo.

## Gate state

Verification passed against the refreshed workflow and release bindings. The
Stage 05 Ship gate is reopened and human-owned. No downstream stage exists or
is authorized.
