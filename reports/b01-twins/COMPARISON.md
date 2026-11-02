# Benchmark: `minimal` on 4 simulated cases

**SIMULATED incidents, not production data.** A batch is one fresh run of every case with every method. This compares 3 batches: 3 with `minimal`, started in the order listed under Provenance. Every batch repeats one arm, commit `97e1bff8c05c` and the `minimal` profile, with `gemini-3.5-flash-lite` on the Gemini free tier, and one grader scored them all after every run was saved.

| Method | `minimal`: MINIMAL thinking, up to 1,024 output tokens a response |
|---|---|
| Single-shot model | **33/60** (55%) · per batch 10, 12, 11 |
| Tool-using model | **34/60** (57%) · per batch 8, 12, 14 |

Scores count checks passed: 5 a run (status, cause, change, segment, rollback), so 3 batches of 4 cases make 60. Rules, the no-model baseline in `db/benchmark/rules.mjs`, scored 14/20 in every batch; its rules target this benchmark's incident families, so read it as a reference point.

## Do-nothing policies

Answers that never read the data, scored by the same grader. A method has to beat every one of them before its score says it read anything. Each number is one batch: checks passed of 20, cause check of 4.

| Who | Checks passed | Cause check | By case |
|---|---|---|---|
| Always "no incident" | 12 | 1 | B21 3, B22 3, B23 5, B24 1 |
| Always abstain | 11 | 0 | B21 4, B22 4, B23 3, B24 0 |
| Always abstain, keeping an outage open | 13 | 2 | B21 5, B22 5, B23 3, B24 0 |
| Always blame the newest change and roll back | 8 | 1 | B21 1, B22 1, B23 2, B24 4 |
| Rules | 14, 14, 14 | 1, 1, 1 | |
| Single-shot · `minimal` | 10, 12, 11 | 2, 2, 2 | |
| Tool-using · `minimal` | 8, 12, 14 | 1, 1, 2 | |

## Twin pairs

**Shown beside the score, not part of it.** B21 and B22 show the same evidence at T1 and hide opposite truths; B23 and B24 are the same hour after the late rows land. An answer is `rollback` if it recommends one, `open` if it keeps the outage in play (the cause check's test) and recommends something else, and `closed` otherwise. 3 batches can show a pattern, not prove improvement; passing makes a change eligible for human review, nothing more. Commit `97e1bff8c05c` pins the grader version.

Each list holds one number a batch. Read and Cited count the T2 rows that differ between the worlds: what the run saw, and what it used.

| Case | World, pull | Method | Score of 5 | Cause check | Where the answer leads | Read | Cited |
|---|---|---|---|---|---|---|---|
| B21 | harmless, T1 | Rules | 4, 4, 4 | 0/3 | 3× closed, right only by luck | none available | none available |
| B21 | harmless, T1 | Single-shot | 0, 0, 1 | 0/3 | 2× needless rollback put to a person; 1× waits, then closes when the data lands | none available | none available |
| B21 | harmless, T1 | Tool-using | 1, 2, 2 | 0/3 | 1× waits, then closes when the data lands; 2× closed, right only by luck | none available | none available |
| B22 | outage, T1 | Rules | 4, 4, 4 | 0/3 | 3× outage left running | none available | none available |
| B22 | outage, T1 | Single-shot | 0, 2, 0 | 0/3 | 2× rollback put to a person on a guess; 1× waits, then catches it when the data lands | none available | none available |
| B22 | outage, T1 | Tool-using | 2, 2, 2 | 0/3 | 3× outage left running | none available | none available |
| B23 | harmless, T2 | Rules | 3, 3, 3 | 0/3 | 3× closed, rightly | 3, 3, 3 of 3 | 0, 0, 0 of 3 |
| B23 | harmless, T2 | Single-shot | 5, 5, 5 | 3/3 | 3× closed, rightly | 3, 3, 3 of 3 | 2, 2, 2 of 3 |
| B23 | harmless, T2 | Tool-using | 5, 3, 5 | 2/3 | 3× closed, rightly | 3, 3, 2 of 3 | 1, 1, 2 of 3 |
| B24 | outage, T2 | Rules | 3, 3, 3 | 3/3 | 3× still waiting, though the data has landed | 3, 3, 3 of 3 | 3, 3, 3 of 3 |
| B24 | outage, T2 | Single-shot | 5, 5, 5 | 3/3 | 3× rollback put to a person | 3, 3, 3 of 3 | 2, 2, 2 of 3 |
| B24 | outage, T2 | Tool-using | 0, 5, 5 | 2/3 | 1× no answer given; 2× rollback put to a person | 3, 3, 3 of 3 | 0, 3, 3 of 3 |

5/5 without citing every row that separates the worlds, which may be timing rather than evidence: B23 Single-shot in batch 1 (cited 2 of 3); B23 Tool-using in batch 1 (cited 1 of 3); B24 Single-shot in batch 1 (cited 2 of 3); B23 Single-shot in batch 2 (cited 2 of 3); B24 Single-shot in batch 2 (cited 2 of 3); B23 Single-shot in batch 3 (cited 2 of 3); B23 Tool-using in batch 3 (cited 2 of 3); B24 Single-shot in batch 3 (cited 2 of 3).

### Noise: B21 against B22

The same evidence, so a different answer is model randomness or run order. A later fix has to move the scores by more than this.

| Method | Batch 1 | Batch 2 | Batch 3 | Different |
|---|---|---|---|---|
| Rules | abstained, closed / abstained, closed | abstained, closed / abstained, closed | abstained, closed / abstained, closed | 0 of 3 |
| Single-shot | completed, rollback / completed, rollback | completed, rollback / completed, open | completed, open / completed, rollback | 2 of 3 |
| Tool-using | completed, open / completed, closed | completed, closed / completed, closed | completed, closed / completed, closed | 1 of 3 |

### First difference: T1 against T2

Where each tool-using run first parted from its own world's other pull. Single-shot runs read every row up front, so theirs differ from the first request.

- Batch 1, harmless (B21 → B23): step 1: both asked `revenue.inspect {"end":"2026-09-01T10:00:00.000Z","limit":50,"start":"2026-09-01T09:00:00.000Z"}`; only T1 saw `e_c628cdd738b3`, only T2 saw `e_6c3f89c999b9`, `e_1071efe6dc01`, `e_dbb9a9e96d2c`. Answers: open → closed.
- Batch 1, outage (B22 → B24): step 1: both asked `revenue.inspect {"end":"2026-09-01T10:00:00.000Z","limit":50,"start":"2026-09-01T09:00:00.000Z"}`; only T1 saw `e_4a7769ee97ee`, only T2 saw `e_808aa1c4653b`, `e_e6d6f2f7c550`, `e_e9e7055e4a22`. Answers: closed → no answer.
- Batch 2, harmless (B21 → B23): step 1: both asked `revenue.inspect {"end":"2026-09-01T10:00:00.000Z","limit":50,"start":"2026-09-01T09:00:00.000Z"}`; only T1 saw `e_c628cdd738b3`, only T2 saw `e_6c3f89c999b9`, `e_1071efe6dc01`, `e_dbb9a9e96d2c`. Answers: closed → closed.
- Batch 2, outage (B22 → B24): step 1: both asked `revenue.inspect {"end":"2026-09-01T10:00:00.000Z","limit":50,"start":"2026-09-01T09:00:00.000Z"}`; only T1 saw `e_4a7769ee97ee`, only T2 saw `e_808aa1c4653b`, `e_e6d6f2f7c550`, `e_e9e7055e4a22`. Answers: closed → rollback.
- Batch 3, harmless (B21 → B23): step 1: both asked `revenue.inspect {"end":"2026-09-01T10:00:00.000Z","limit":50,"start":"2026-09-01T09:00:00.000Z"}`; only T1 saw `e_c628cdd738b3`, only T2 saw `e_6c3f89c999b9`, `e_1071efe6dc01`, `e_dbb9a9e96d2c`. Answers: closed → closed.
- Batch 3, outage (B22 → B24): step 1: both asked `revenue.inspect {"end":"2026-09-01T10:00:00.000Z","limit":50,"start":"2026-09-01T09:00:00.000Z"}`; only T1 saw `e_4a7769ee97ee`, only T2 saw `e_808aa1c4653b`, `e_e6d6f2f7c550`, `e_e9e7055e4a22`. Answers: closed → rollback.

### Validity

- Batch 1: case files match the batch manifest; the T1 twins show the same rows; no attempt stopped by the provider; no attempt interrupted; no run ended outside the model.
- Batch 2: case files match the batch manifest; the T1 twins show the same rows; no attempt stopped by the provider; 1 attempt interrupted with no result and rerun (B22 Tool-using); no run ended outside the model.
- Batch 3: case files match the batch manifest; the T1 twins show the same rows; no attempt stopped by the provider; no attempt interrupted; no run ended outside the model.

## By case

Each cell: checks passed over all runs, then each batch's score in start order.

| Case | Split | Single-shot · `minimal` | Tool-using · `minimal` | Rules |
|---|---|---|---|---|
| B21 | Twin holdout | 1/15 (0, 0, 1) | 5/15 (1, 2, 2) | 4/5 in every batch |
| B22 | Twin holdout | 2/15 (0, 2, 0) | 6/15 (2, 2, 2) | 4/5 in every batch |
| B23 | Twin holdout | 15/15 (5, 5, 5) | 13/15 (5, 3, 5) | 3/5 in every batch |
| B24 | Twin holdout | 15/15 (5, 5, 5) | 10/15 (0, 5, 5) | 3/5 in every batch |
| Twin holdout (B21, B22, B23, B24) | | 33/60 (10, 12, 11) | 34/60 (8, 12, 14) | 14/20 in every batch |
| **All** | | **33/60 (10, 12, 11)** | **34/60 (8, 12, 14)** | 14/20 in every batch |

## By check

Runs that passed each check, out of all runs.

| Check | Single-shot · `minimal` | Tool-using · `minimal` |
|---|---|---|
| status | 6/12 | 5/12 |
| cause | 6/12 | 4/12 |
| change | 7/12 | 9/12 |
| segment | 6/12 | 5/12 |
| rollback | 8/12 | 11/12 |

## How runs ended

A run that ends without a finding fails every check.

| Ending | Single-shot · `minimal` | Tool-using · `minimal` |
|---|---|---|
| completed | 12 | 11 |
| invalid_output (invalid_json_or_schema) | 0 | 1 |

## Cost per run (mean)

| Per run | Single-shot · `minimal` | Tool-using · `minimal` |
|---|---|---|
| Tokens (input + output) | 2,299 | 16,294 |
| Output tokens (thinking included) | 663 | 1,298 |
| Model turns | 1 | 6.4 |
| Tool calls | 0 | 5.4 |
| Gemini requests | 3 | 19.3 |
| Wall time | 12.9 s | 87.3 s |

Wall time includes waiting for free-tier request slots: Gemini requests start at least 4.5 s apart. Requests count generate and token-count calls, retries included.

## How each check is graded

- **status**: The finding must end `completed`, or `epistemic_abstention` on the cases where the rubric says to abstain. On the no-incident case the data is complete and flat, so abstaining fails.
- **cause**: Graded on meaning, not wording. If `relatedChangeId` names a deploy or pricing change, it must be the rubric's change. Otherwise the first cause word in the top-ranked diagnosis decides: checkout/validation, provider/gateway/processor, price/pricing, acquisition/composition/mix/traffic/channel/share/distribution, or notification/email (never right here). On the abstain cases the run must abstain. On the twin abstain cases, where the same evidence hides an outage in one world, it must also keep the outage among its hypotheses or unresolved alternatives and recommend something other than `none`. A bare mention of the provider, or an outage denied or explained away, does not keep it open. On the no-incident case it must blame no change, and its top-ranked diagnosis must say nothing is wrong (no incident, no drop, stable, unchanged, normal and the like) or name no cause at all.
- **change**: `relatedChangeId` must be the rubric's change, or empty when the rubric has none.
- **segment**: `affectedSegment` must name the rubric's segment (case, word order and separators ignored), or be empty when the rubric has none.
- **rollback**: Where the rubric wants a rollback, the run must recommend rolling back that service (by name or change id) with `approvalRequired: true`. Everywhere else it must not recommend a rollback.
- **keyEvidence**: Shown, not scored: rubric evidence groups whose rows the run both saw and cited, with the group's typed fact holding on them.
- **citations**: Shown, not scored: cited ids the run had actually seen, out of all ids it cited.

## Provenance

- Commit: `97e1bff8c05c25ef3e6f711961001e93aac33965`
- Model: `gemini-3.5-flash-lite`; versions reported: `gemini-3.5-flash-lite`
- Profile `minimal`: thinking MINIMAL; 1024 output tokens a response, 6144 a run; 8192-token context
- Batch 1: `outputs/b01/2026-11-02`, `minimal`, started 2026-11-01T21:05:13.242Z
- Batch 2: `outputs/b01/2026-11-02-2`, `minimal`, started 2026-11-01T21:13:17.860Z
- Batch 3: `outputs/b01/2026-11-02-3`, `minimal`, started 2026-11-02T07:28:49.963Z
- Rubric `tests/evaluator/b21-b24/rubric.json` sha256 `97b73a06823f4911e32061bfa31f907911cea458397c38ffaeabd37dac5bb5ea`
- Grader sha256 `e9c28f4d8c33104306dc7cfe1c443222e8932dde7855b3bbefac36b08a5c6302`; compared 2026-11-02T07:39:09.105Z
