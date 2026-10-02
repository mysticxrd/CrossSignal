---
type: additive-data-compatibility-review
profile: b01-siwc-measured-v1
status: ready-for-human-review
truth_mode: SIMULATED
model_evaluation: NOT_RUN
---

# Data compatibility with the accepted measured profile

The owner accepted exact contract hash
fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f.
The additive Spec gate records that decision; original accepted Spec/Data outputs,
gates, fixtures, private truth, rubric and evaluator artifacts remain unchanged.
This report reviews compatibility only. Its human acceptance is pending.

## Findings

- Accepted Data directory remains be6d15ef711e30cf2820855eedc99508458f2de9cce513fc3d8597af2dc002da. No fixture, judgment, schema,
  event, truth/rubric, scope/cutoff, split or evaluator file was regenerated.
- All five public contract copies remain byte-identical. Isolated request
  preparation exposes no private fields, old answers or development messages.
  Live investigator isolation/access probes remain NOT_RUN.
- The full eager request bodies are 6108–6841 bytes; tool initial bodies are
  7390 bytes. All initial inputs fit the accepted 8192-byte ceiling without
  deleting decisive facts or required schema/task content.
- The current query-history serialization is tight: one revenue query with
  limit=1 yields 8032–8033 bytes, limit=5 yields 8397–8401 bytes, limit=50 yields
  8944–9224 bytes. The latter two exceed the ceiling. Even legal tool calls may
  therefore prevent another model turn. Stop as context_overflow and keep the
  result/failure in the denominator; no hidden truncation, repair or restart.
- A ten-query stress reconstruction is 22940–25740 bytes and cannot be sent.
  This is a fixture measurement, not an investigator result or causal judgment.
- Pure host accounting checks enforce admission, one in-flight attempt, 12 model
  turns/one single-shot attempt, 10 tool attempts including invalid requests,
  monotonic deadline accounting and no retry after unknown/indeterminate usage.
  Actual timer/transport cancellation and durable recording remain pending.
- Reported output usage includes the reasoning subset once. Output >1024 or
  cumulative output >6144 becomes a retained budget failure. At a known total
  >=6144, no next attempt is admitted. Remote generation can overshoot; no hard
  generation or combined-token guarantee is claimed. Provider input usage is
  measured, not checked against the superseded combined-context limit.
- All other Data contracts are retained: scoped read-only tools, 50 rows,
  160 query characters, tenant/cursor/time checks and stable citation IDs.
  No tools can approve or perform effects. Sampling/model and billing conditions
  remain execution prerequisites, separate from this Data review.

## Verification and practical limits

31 offline protocol/budget tests and affected lint passed; both repository diff
checks passed. Original Data verification passed 13 checks, seven negatives and
22 input bindings with no drift in 934 protected historical files. Raw evidence:
factory/03_build/output/chatgpt-subscription/measured-profile/OFFLINE_CHECKS.json,
SHA-256 0e7da834dc12a283d9ffca96fdeba2caa6733a613a355101eff456da93af55b5. The request/context receipts are hash-bound below.

This establishes structural compatibility with explicitly retained budget
failures; it does not establish useful investigation quality, route parameter
acceptance, real-account eligibility, allowance-only/zero-credit settings or
actual models available to CrossSignal. No model request, database/history write,
installation, paid operation, LIVE change or intervention occurred.

## Human decision

Review this exact report and VERIFY hash before accepting Data compatibility.
Acceptance keeps the approved byte ceiling and overshoot policy, including the
reported query-context failures. A changed common serialization would require
new exposure/compatibility evidence and a reviewed frozen configuration before
scoring. No results may be silently repaired or reused as fresh model runs.
This is not complete Build acceptance or runtime authority.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/01_spec/output/SPEC.md` | `e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e` |
| `factory/02_data/output/DATA_PACKAGE.md` | `ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f` |
| `factory/02_data/output/HUMAN_GATE.md` | `06bd60ec2e816cddcb4ecfe3db0ca0a9e0e0361edb1a7a326287e4302167a722` |
| `factory/02_data/output/VERIFY.md` | `2b7e2dc16b1aeaa7706fe800180511133593f85a86aa5011587cb5aede0f1fcc` |
| `factory/02_data/benchmark` | `be6d15ef711e30cf2820855eedc99508458f2de9cce513fc3d8597af2dc002da` |
| `factory/01_spec/amendments/b01-siwc-measured-v1` | `4caeba4077caab8a2489de89b4c4ce1094fdc5b0867461ccd8f7d74144dd78e6` |
| `db/benchmark` | `1da15a147eef8fee5c77eed29491daaac6ddb086dee90e66d3ea52c078287483` |
| `tests/benchmark.test.mjs` | `bbf03624252793a9877561fb8762fe749c1ce076520d1c489578ea2659b6760b` |
| `tests/benchmark-subscription.test.mjs` | `a60211f8deffb7bcb4a86cb36f26c1c8fda5c7c8db2b9ffc238ff4c417b133ea` |
| `tests/benchmark-subscription-budget.test.mjs` | `460b6c9ee5c66bdab2314fd7c469c26e5a05c08c03e220fa819cd1be229b4bb0` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/OFFLINE_CHECKS.json` | `0e7da834dc12a283d9ffca96fdeba2caa6733a613a355101eff456da93af55b5` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/PREPARED_REQUESTS.json` | `e356178b49282ea5344e891512051d5d29912d7e44649627064ddc62930d73a5` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/QUERY_CONTEXT_CHECK.json` | `e145b42c921b076af9f20f6c26404c861773475185cbfae1d42eeec929058562` |
