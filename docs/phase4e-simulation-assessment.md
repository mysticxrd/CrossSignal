# Phase 4e — simulated checkout assessment

Date: 2026-09-25 (Asia/Kolkata).

## Bounded result

The Case derives a **SIMULATED harness assessment** from its persisted checkout artifacts. It requires at least one verified capture scenario and one verified decline scenario. Status progresses from `awaiting_runs` to `in_progress` to `verified`; each run records the previous and resulting simulation status. Repeated runs of only one scenario cannot finish the check.

This is scenario coverage, not incident recovery, model evaluation, or a real-business outcome. The operator selects the simulated result. A decline is an expected negative test, not new evidence of the incident. The revenue-leak Case remains unresolved and its cause unconfirmed. Actual Mobile Safari verification awaits device access.

## Implementation

- `db/case-simulation-outcome.mjs`: re-verifies saved rows, orders them by UTC timestamp and run ID, derives counts and transitions, and hashes the assessment using the existing canonical content hash.
- `db/case-decision.mjs` / `.ts`: supplies `simulationOutcome` separately from the real follow-up `outcome`.
- `app/SimulationOutcomePanel.tsx`: two scenario checks, current simulation status, unresolved Case boundary, expandable run IDs, hashes, timestamps and event references.
- `app/CaseDecisionView.tsx`: integrates the panel and displays “Open · cause unconfirmed.” Removes the stale statement that the executable device-test target itself is missing.
- `tests/case-simulation-outcome.test.mjs` and `tests/case-decision.test.mjs`: lifecycle, order/reload determinism, hash and trace binding, duplicate/tamper/tenant rejection, and simulation versus real-outcome separation.

The assessment is recomputed from immutable saved runs on every Case read. It is not a separately inserted database receipt or a persisted closure decision. It does not use a clock, random number, model, or evaluator answer. No schema, Edge Function, auth, RLS, trigger, or payment-provider change was needed.

## Checks

- **27/27 focused tests passed** in the development checkout:
  `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs tests/case-simulation-outcome.test.mjs`
- The nine directly affected assessment/Case integration tests passed in the exact TEST source checkout.
- Production vinext build passed in the TEST source checkout. The bundled build launcher encountered a Windows npm-path error; the same existing build script succeeded through the installed npm CLI's absolute path.
- React best-practices review: derived assessment stays in the server projection; panel adds no effect, state, fetch, or mutation. Histories are bounded by the existing 20-run cap.
- `git diff --check` passed. The historical L14 factory still reports complete; current work remains unsealed and does not imply a new human gate acceptance.
- In-app browser verified both scenarios, one saved run each, unresolved Case, excluded original trial, and awaiting real observation. Reload and re-expansion retained the exact assessment hash `146b81c29bcbd759a6440f919198be4012c902e0a436fc999ea612d1904f0afd`. The narrow layout was inspected visually. No new simulation or receipt was submitted during these checks.
- Assessment transitions cite existing run `sim_2b159ed7-8b62-41cb-8360-084be15898bf` (awaiting → in progress) and `sim_6732fb97-33e4-4a23-8f7a-9bf3960d70a4` (in progress → verified), with the original run hashes and all six trace event references preserved.

## Deployment provenance

Private TEST source commit: `e07fc0309d13be31a4b86149bf3e645badd3ab04`.

Private TEST Site version **11**, deployment `appgdep_6ab57a3fc42881918bb7b5265a7c0ab5`, status **succeeded**, environment revision 2. Edge Function remains v11 from the previous milestone.

Verified URL: https://crosssignal-supabase-test.hishamxrd.chatgpt.site/?verification=simulation-assessment-v11

Bundle SHA-256: `9da0591c498c724688080e013cc622ea27bf8c8cd5e16658b73fbdba8e2ad2cb`.

The existing Sites workflow pushed the exact source. Its Windows Bash packaging wrapper failed; the bundled build-preparation helper and native tar produced the validated archive, as for prior TEST releases. Existing owner-only access was rechecked; no external visitors are allowed. LIVE was not deployed.

## Next milestone

**Superseded on 2026-09-26:** The one-command local golden-Case replay and
separate grader are implemented and committed at `d802898`; see
[Phase 5 evidence](phase5-golden-case-replay.md). The local detector matrix
also exists as uncommitted regression coverage.

The next product milestone is [A01 synthetic investigation and intervention](a01-synthetic-investigation-handoff.md),
subject to the existing next-run transition and human gates. It must connect
an investigated cause to an exactly approved simulated remedy and observed
synthetic result. Actual device verification and real-business measurement
remain separate future work and are not prerequisites. See
[current development direction](hiring-mvp-direction.md).
