# E1 world report: the baseline

**BUILT: the world generator and the trigger. SIMULATED: every order and payment, following GA4's real daily revenue. PLANNED: causes, cases, the agent and the checklist baseline.**

| | |
|---|---|
| World version | `e1-world-3` |
| Seed | `baseline` |
| World hash | `7ee1b36984801c416d3542caa3c4413a7fa16568ab7f3f779b037ef0a55a1200` |
| Days | 2026-11-02 to 2026-12-13 (GA4 2020-11-02 to 2020-12-13), 42 |
| Orders | 3051 |
| Possible "now" hours | 649, 2026-11-10 00:00 to 2026-12-07 00:00 IST |

## Trigger crossings (Fix F2)

The trigger crosses when store revenue paid in the trailing 24 h is at least 25% below the same 24 h 7 days earlier, checked every hour on the case clock. A window opens at a crossing and ends when the trailing 24 h is back within 10% of its comparison; a crossing within 24 h of a window's last crossing hour shares its days and rejoins it.

Seed `baseline`: 89 crossing hours in **5 distinct crossing windows**.

Across 20 seeds (`baseline`, `sweep-1` to `sweep-19`): 5 to 6 windows. **Distinct crossing windows: 5** (the fewest; gate: at least 6, fail: no-cause cases share windows, and the README must say so).

| Window | Opens (IST) | Crossing hours | Gap at opening | Re-arms (IST) | Sale week in |
|---|---|---|---|---|---|
| 1 | 2026-11-10 00:00 | 11 | 54.46% | 2026-11-10 11:00 | no |
| 2 | 2026-11-15 11:00 | 23 | 34.01% | 2026-11-16 15:00 | no |
| 3 | 2026-11-26 22:00 | 13 | 25.97% | 2026-11-28 15:00 | dip |
| 4 | 2026-12-01 20:00 | 40 | 33.14% | 2026-12-04 15:00 | dip, comparison |
| 5 | 2026-12-06 23:00 | 2 | 35.26% | open at the last "now" | comparison |

Window 1 opens at the first possible "now": the trigger may have crossed earlier, before a week-earlier comparison exists, so its "now" is set by where the data starts.

The windows are public by construction: anyone with the committed GA4 CSV can recompute them. Development and held-out no-cause cases use disjoint windows (section 8 decision 7). The crossing hours are pinned in `tests/fixtures/e1-trigger/baseline-crossings.json`.

Run `node scripts/run-e1-world-report.mjs` to regenerate; add `--check` to verify the committed report byte for byte.
