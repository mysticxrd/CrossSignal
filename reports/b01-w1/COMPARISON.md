# Benchmark: `low` on 5 real-baseline cases

**Real store data, injected incidents.** Revenue rows are a real store's daily traffic and sales; where a case has an incident, it was injected into those rows and labelled before any run. Deploys, health readings and support messages are synthetic. A batch is one fresh run of every case with every method. This compares 3 batches: 3 with `low`, started in the order listed under Provenance. Every batch repeats one arm, commit `a37afcc6d381` and the `low` profile, with `gemini-3.5-flash-lite` on the Gemini free tier, and one grader scored them all after every run was saved.

| Method | `low`: LOW thinking, up to 4,096 output tokens a response |
|---|---|
| Single-shot model | **39/75** (52%) · per batch 15, 13, 11 |
| Tool-using model | **39/75** (52%) · per batch 14, 11, 14 |

Scores count checks passed: 5 a run (status, cause, change, segment, rollback), so 3 batches of 5 cases make 75. Rules, the no-model baseline in `db/benchmark/daily-rules.mjs`, scored 16/25 in every batch; its rules target this benchmark's incident families, so read it as a reference point.

## By case

Each cell: checks passed over all runs, then each batch's score in start order.

| Case | Split | Single-shot · `low` | Tool-using · `low` | Rules |
|---|---|---|---|---|
| B16 | Real baseline | 4/15 (2, 0, 2) | 7/15 (3, 2, 2) | 2/5 in every batch |
| B17 | Real baseline | 13/15 (5, 5, 3) | 10/15 (5, 0, 5) | 5/5 in every batch |
| B18 | Real baseline | 11/15 (3, 5, 3) | 9/15 (3, 3, 3) | 1/5 in every batch |
| B19 | Real baseline | 11/15 (5, 3, 3) | 11/15 (3, 5, 3) | 3/5 in every batch |
| B20 | Real baseline | 0/15 (0, 0, 0) | 2/15 (0, 1, 1) | 5/5 in every batch |
| Real baseline (B16, B17, B18, B19, B20) | | 39/75 (15, 13, 11) | 39/75 (14, 11, 14) | 16/25 in every batch |
| **All** | | **39/75 (15, 13, 11)** | **39/75 (14, 11, 14)** | 16/25 in every batch |

## By check

Runs that passed each check, out of all runs.

| Check | Single-shot · `low` | Tool-using · `low` |
|---|---|---|
| status | 9/15 | 9/15 |
| cause | 5/15 | 3/15 |
| change | 6/15 | 6/15 |
| segment | 10/15 | 8/15 |
| rollback | 9/15 | 13/15 |

## How runs ended

A run that ends without a finding fails every check.

| Ending | Single-shot · `low` | Tool-using · `low` |
|---|---|---|
| completed | 12 | 12 |
| epistemic_abstention | 2 | 3 |
| invalid_output (incomplete_provider_output) | 1 | 0 |

## Cost per run (mean)

| Per run | Single-shot · `low` | Tool-using · `low` |
|---|---|---|
| Tokens (input + output) | 5,439 | 25,904 |
| Output tokens (thinking included) | 758 | 1,428 |
| Model turns | 1 | 5.9 |
| Tool calls | 0 | 4.9 |
| Gemini requests | 3.1 | 17.6 |
| Wall time | 16.3 s | 84.5 s |

Wall time includes waiting for free-tier request slots: Gemini requests start at least 4.5 s apart. Requests count generate and token-count calls, retries included.

## How each check is graded

- **status**: The finding must end `completed`, or `epistemic_abstention` on the cases where the rubric says to abstain. On the no-incident case the data is complete and moves only with the store's ordinary day-to-day variation, so abstaining fails.
- **cause**: Graded on meaning, not wording. If `relatedChangeId` names a deploy or pricing change, it must be the rubric's change. Otherwise the first cause word in the top-ranked diagnosis decides: checkout/validation, provider/gateway/processor, price/pricing, acquisition/composition/mix/traffic/channel/share/distribution, or notification/email (never right here). On the abstain cases the run must abstain. On the no-incident case it must blame no change, and its top-ranked diagnosis must say nothing is wrong (no incident, no drop, stable, unchanged, normal and the like) or name no cause at all. Real store data moves with the week, so on the no-incident case weekend, weekday, weekly, day of week, seasonal, usual, typical, ordinary, variation and noise also say nothing is wrong.
- **change**: `relatedChangeId` must be the rubric's change, or empty when the rubric has none.
- **segment**: `affectedSegment` must name the rubric's segment (case, word order and separators ignored), or be empty when the rubric has none.
- **rollback**: Where the rubric wants a rollback, the run must recommend rolling back that service (by name or change id) with `approvalRequired: true`. Everywhere else it must not recommend a rollback.
- **keyEvidence**: Shown, not scored: rubric evidence groups whose rows the run both saw and cited, with the group's typed fact holding on them. Daily facts compare alert days with earlier days (tests/evaluator/daily-predicates.mjs).
- **citations**: Shown, not scored: cited ids the run had actually seen, out of all ids it cited.

## Provenance

- Commit: `a37afcc6d381e24f1a2b9a7f05870df464d6da65`
- Model: `gemini-3.5-flash-lite`; versions reported: `gemini-3.5-flash-lite`
- Profile `low`: thinking LOW; 4096 output tokens a response, 24576 a run; 16384-token context
- Batch 1: `outputs/b01/2026-10-06`, `low`, started 2026-10-06T07:01:41.512Z
- Batch 2: `outputs/b01/2026-10-06-2`, `low`, started 2026-10-06T07:12:29.117Z
- Batch 3: `outputs/b01/2026-10-06-3`, `low`, started 2026-10-06T07:20:39.720Z
- Rubric `tests/evaluator/b16-b20/rubric.json` sha256 `9cbb8055164d55a5f8730b21e40472aa71ec992496df20d879ca3a8e381dad9a`
- Grader sha256 `d24bd72350bc31e27ce64705f226db23a330c4e21489e1acdb33e12dbf4852b5`; compared 2026-10-06T07:29:56.372Z
