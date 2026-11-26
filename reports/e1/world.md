# E1 world report: the baseline

**BUILT: the world generator and the trigger. SIMULATED: every order and payment, following GA4's real daily revenue. PLANNED: causes, cases, the agent and the checklist baseline.**

| | |
|---|---|
| World version | `e1-world-6` |
| Seed | `baseline` |
| World hash | `0d4f13c10885169e9d92102a30024988abfbd559dc2a354e5f1fe448ca0ec55c` |
| Days | 2026-11-02 to 2026-12-13 (GA4 2020-11-02 to 2020-12-13), 42 |
| Orders | 3051 |
| Possible "now" hours | 649, 2026-11-10 00:00 to 2026-12-07 00:00 IST |

## Trigger crossings (Fix F2)

The trigger crosses when store revenue paid in the trailing 24 h is at least 25% below the same 24 h 7 days earlier, checked every hour on the case clock. A window opens at a crossing and ends when the trailing 24 h is back within 10% of its comparison; a crossing within 24 h of a window's last crossing hour shares its days and rejoins it.

Seed `baseline`: 121 crossing hours in **5 distinct crossing windows**.

Across 20 seeds (`baseline`, `sweep-1` to `sweep-19`): 5 to 6 windows. **Distinct crossing windows: 5** (the fewest; gate: at least 6, fail: no-cause cases share windows, and the README must say so).

| Window | Opens (IST) | Crossing hours | Gap at opening | Re-arms (IST) | Sale week in |
|---|---|---|---|---|---|
| 1 | 2026-11-10 00:00 | 19 | 54.46% | 2026-11-10 21:00 | no |
| 2 | 2026-11-14 22:00 | 26 | 29.23% | 2026-11-16 17:00 | no |
| 3 | 2026-11-26 21:00 | 26 | 26.02% | 2026-11-28 15:00 | dip |
| 4 | 2026-12-01 21:00 | 47 | 25.06% | 2026-12-03 21:00 | dip, comparison |
| 5 | 2026-12-06 22:00 | 3 | 28.69% | open at the last "now" | comparison |

Window 1 opens at the first possible "now": the trigger may have crossed earlier, before a week-earlier comparison exists, so its "now" is set by where the data starts.

The windows are public by construction: anyone with the committed GA4 CSV can recompute them. Development and held-out no-cause cases use disjoint windows (section 8 decision 7). The crossing hours are pinned in `tests/fixtures/e1-trigger/baseline-crossings.json`.

Run `node scripts/run-e1-world-report.mjs` to regenerate; add `--check` to verify the committed report byte for byte.
