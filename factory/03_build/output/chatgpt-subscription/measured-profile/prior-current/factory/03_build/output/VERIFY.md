---
type: verification
unit: b01-api-behavioral-benchmark
stage: 03_build
status: blocked
offline_preflight: passed
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Subscription preparation verification

23 offline tests, affected lint, both Git diff checks and accepted Data
reverification passed. The exact commands/TAP are in
chatgpt-subscription/OFFLINE_CHECKS.json. New prepared bodies are recomputed by the
verifier; all input bindings and prior-current copies are checked. No model,
credential, database or runtime operation is part of these checks.

The route lacks the accepted hard output cap and combined-context guarantee.
The contract amendment is pending; own-client eligibility, account catalog,
allowance-only/zero-credit settings and actual parameter/tokenizer compatibility
are unverified. Full automated benchmark, durable isolation/history, all 50
artifacts, blinded adjudication, complete Build checks and exact SIMULATED runtime
approval remain NOT_RUN. Offline success does not open or accept the Build gate.

Commands: node factory/03_build/verify.mjs --preflight returns 0 for successful
preparation; default node factory/03_build/verify.mjs returns 2 for incomplete
Build. FINAL_CHECK.json records the final invocations and derived factory state.
