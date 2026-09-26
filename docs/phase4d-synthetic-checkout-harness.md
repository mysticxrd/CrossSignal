# Phase 4d — executable synthetic TEST checkout

Verified 2026-09-24 UTC / completed 2026-09-25 Asia/Kolkata.

## Result

The Case now contains an executable, zero-charge synthetic checkout with capture-success and capture-decline scenarios. Both paths were run in the Codex in-app browser and persisted through reload. Each run has its own UUID, three immutable trace events, and a verified artifact hash. All results are explicitly **SIMULATED**.

The user corrected the prior plan: no executable TEST checkout existed. The earlier manual receipt was only a trial. This change supplies a bounded simulation target; it does not turn that trial into evidence or complete actual Mobile Safari verification.

## Scope and authority

- Existing owner-private TEST only, Supabase project `tonuxepirauyqcwbwenw`, organization CrossSignal, confirmed `free` / `tier_free` and ACTIVE_HEALTHY.
- Existing authentication, workspace membership, Case/proposal binding, normalization triggers, and historical records retained. LIVE was not deployed or migrated.
- At most 20 immutable runs per Case. No payment provider, paid model, or paid resource is invoked. Actual charged amount is always zero.
- A simulation click authorizes only that simulation. The historical manual-check approval remains a separate record.
- Evaluator ground truth is not read by the harness. Simulations are stored separately from recorded incident events, manual receipts, and follow-up observations.

## Implementation map

| File | Responsibility |
| --- | --- |
| `supabase/functions/_shared/case-checkout.mjs` | Strict inputs; pure deterministic artifact and three-event trace; SIMULATED/TEST/zero-charge invariants. |
| `supabase/functions/cfr-trace-reader/index.ts` | Authenticated owner execution, exact Case/proposal binding, advisory lock, same-ID retry behavior and cap. |
| `db/case-checkout.mjs` | Re-derive artifacts, verify hashes and tenant bindings, reject tampering/duplicates/overflow on reload. |
| `db/case-decision.mjs`, `db/case-decision.ts` | Load simulations into the Case projection without feeding real outcome calculations. |
| `app/synthetic-checkout-actions.ts`, `app/SyntheticCheckoutPanel.tsx` | Authenticated action and scenario picker, unique run IDs, retained retry ID, trace history, explicit simulation limits. |
| `app/CaseDecisionView.tsx` | Integrate harness, preserve approval and excluded trial, keep actual device/outcome pending. |
| `supabase/migrations/20260924153231_synthetic_case_checkout.sql` | Additive private table, forced RLS, immutable runtime grants, 20-run cap, reserve `sim_` IDs from real-check receipts. |
| `tests/case-checkout.test.mjs`, `tests/case-decision.test.mjs`, `supabase/tests/synthetic_checkout.sql` | Contract, projection, truth-boundary and database verification. |

## Verification evidence

- **24/24 focused Node tests passed** in the development and TEST source checkouts:
  `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs`
- Full vinext production build passed in both checkouts; `git diff --check` passed.
- Rollback-only TEST SQL passed: owner read/write, foreign/missing principal and cross-workspace isolation, invalid truth rejection, duplicate run rejection, update/delete denial, 20-run cap, and rejection of simulation references as real-check/outcome evidence. Test rows were rolled back.
- Supabase security advisor returned zero findings after migration.
- Browser: selected capture, submitted, then selected decline and submitted. Reload retained both runs. Expanded traces matched persisted IDs/hashes below. Narrow viewport inspected visually. Trial exclusion and “Awaiting observation” remained visible.
- Final connector read confirmed **56 incident events, 1 approval, 1 original receipt, 1 trial marker, 0 real rechecks, 0 follow-up events, and 2 simulations**. Existing runtime state/event normalization triggers remain installed.

| Scenario | Run ID | Executed at (UTC) | Artifact SHA-256 |
| --- | --- | --- | --- |
| SIMULATED capture | `sim_2b159ed7-8b62-41cb-8360-084be15898bf` | `2026-09-24T15:42:52.557Z` | `a72e2a626cad55199367192195a123902dbe20690fc7c8aed964c7714bf4a30a` |
| SIMULATED decline | `sim_6732fb97-33e4-4a23-8f7a-9bf3960d70a4` | `2026-09-24T19:12:21.836Z` | `2d6c3a025f7ae64762ba592b5549e7ce0764a44416a3b5f64519e41f75773a81` |

Each run has event IDs formed by appending `-started`, `-capture`, and `-completed`. Both persisted artifacts say `chargedCents: 0`, `deviceVerification: pending`, and `businessOutcome: not_measured`.

Preserved excluded receipt hash: `620192bb3e3b417886c37ecb6d8b1fa4ab8e3a3c61516487ba5a7f5d3866d8dd`.
Case: `case-golden-mobile-checkout`; workspace: `l14-workspace-a`.

## Deployment

- Private TEST: https://crosssignal-supabase-test.hishamxrd.chatgpt.site/?verification=synthetic-checkout-v10
- Sites version **10**, deployment `appgdep_6ab5449c4cc881918dbb3781a9c53fb4`.
- Deployed source commit: `0a66d2ace07f3413181a38c51d68e76f2f426c19` in `work/crosssignal-test-source-open`.
- Bundle SHA-256: `306ca7cc1268346098d37fdc4c9ce8e763a05daf8382f78305150528d227fe9b`.
- `cfr-trace-reader` **v11 ACTIVE**; existing custom preview authentication retained.
- Migration applied as `synthetic_case_checkout`. The Site stayed owner-private; no LIVE environment change.
- The initial base-URL reload displayed the prior cached UI; a fresh verification query displayed version 10 and was used for the completed save/reload checks.

## Limits and next milestone

**Next-step correction — 2026-09-26:** The simulation assessment and golden
replay mentioned below are complete. The current milestone is
[A01 synthetic investigation and approved intervention](a01-synthetic-investigation-handoff.md).
The dated limits remain evidence; actual device and payment verification are
separate future work, not prerequisites for the synthetic milestone.

- Actual Mobile Safari verification awaits device access. Desktop in-app browser simulation is not device or payment verification.
- No real payment capture, recovered revenue, causal diagnosis, or measured business outcome is claimed. The synthetic $800 incident projection is unchanged.
- Idempotent retry handling is implemented; a deliberate duplicate HTTP retry was not exercised in the browser. SQL uniqueness and local duplicate/tamper checks passed.
- Repository-wide `tsc` remains blocked by existing ambient/Deno/Eve typing issues; the production build and focused tests pass. This is not a clean full typecheck claim.
- The historical L14 factory reports its prior stages complete; the working tree is unsealed. No new human gate was accepted by this work.
- Next bounded product milestone: a separately labeled simulated outcome assessment and Case lifecycle transition tied to these run IDs, with hidden-truth replay checks. Keep actual-device verification and any real-business measurement as separate pending work.
