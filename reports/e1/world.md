# E1 world report: the baseline

**BUILT: the world generator and the trigger. SIMULATED: every order and payment, following GA4's real daily revenue. PLANNED: causes, cases, the agent and the checklist baseline.**

| | |
|---|---|
| World version | `e1-world-2` |
| Seed | `baseline` |
| World hash | `446dbc926b0e956997d1eef4ab39126578a71ed6bc8399165973f7a635ee738f` |
| Days | 2026-11-02 to 2026-12-13 (GA4 2020-11-02 to 2020-12-13), 42 |
| Orders | 3051 |
| Possible "now" hours | 649, 2026-11-10 00:00 to 2026-12-07 00:00 IST |

## Trigger crossings (Fix F2)

The trigger crosses when store revenue paid in the trailing 24 h is at least 25% below the same 24 h 7 days earlier, checked every hour on the case clock. A window opens at a crossing and ends when the trailing 24 h is back within 10% of its comparison, as a dip re-arms; crossings inside it open nothing.

Crossing hours: 92.

**Distinct crossing windows: 6** (gate: at least 6, pass).

| Window | Opens (IST) | Crossing hours | Gap at opening | Re-arms (IST) | Sale week in |
|---|---|---|---|---|---|
| 1 | 2026-11-10 00:00 | 18 | 54.46% | 2026-11-10 19:00 | no |
| 2 | 2026-11-15 11:00 | 25 | 28.32% | 2026-11-16 13:00 | no |
| 3 | 2026-11-26 23:00 | 6 | 31.86% | 2026-11-27 20:00 | dip |
| 4 | 2026-11-27 22:00 | 1 | 27.00% | 2026-11-28 11:00 | dip |
| 5 | 2026-12-01 23:00 | 38 | 29.05% | 2026-12-03 20:00 | dip, comparison |
| 6 | 2026-12-06 20:00 | 4 | 26.41% | open at the last "now" | comparison |

The windows are public by construction: anyone with the committed GA4 CSV can recompute them. Development and held-out no-cause cases use disjoint windows (section 8 decision 7). The crossing hours are pinned in `tests/fixtures/e1-trigger/baseline-crossings.json`.

Run `node scripts/run-e1-world-report.mjs` to regenerate; add `--check` to verify the committed report byte for byte.
