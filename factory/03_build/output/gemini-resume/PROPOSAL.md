---
type: provider-preparation
unit: b01-api-behavioral-benchmark
stage: 03_build
provider: gemini
candidate_model: gemini-3.5-flash-lite
execution_profile: original-accepted-b01-token-limits
conditional_free_request_authorization: recorded
account_and_actual_route: unverified
model_evaluation: NOT_RUN
source_check_date: 2026-10-02
---

# Resume Gemini preparation with the original benchmark contract

The owner asked for the fastest testing route and directed skipping ChatGPT
subscription integration if it adds complexity, then instructed continuing.
The owner separately answered "Authorize verified free-tier Gemini requests".
That authorization applies only after a Free-tier project with billing disabled,
sufficient quota and original-limit compatibility are established. No additional
purchase, paid fallback, installation, deployment or runtime intervention.

The active preparation now selects Gemini. Its original offline adapter and
request bodies remain unchanged; new contexts add bounded host-query requests.
All subscription evidence is retained. The accepted SIWC amendment stays accepted
as history and its Data compatibility gate stays pending. Neither is rewritten,
revoked or used to weaken the selected Gemini token contract. No new factory run.

## Model and transport

Use the existing stable candidate `gemini-3.5-flash-lite`, not a latest alias.
Google lists text output, structured output, function calling and thinking with
1,048,576 input / 65,536 output native limits. Those native capacities do not
replace B01's smaller host limits. This is a candidate for testing, with unknown
diagnosis quality. [Official model specification](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

Reuse Node facilities and the existing GenerateContent REST shape; no SDK or
local model download. Temperature 1, thinking MINIMAL, includeThoughts false,
candidate count 1, text-only JSON responseFormat. Provider-native search, files,
caching, functions, code execution and external tools remain unregistered.
The host parses a JSON query intent and validates/dispatches only the accepted
three read-only query tools. Schema projection retains the original validator.
Use replicate indices 1/2/3 until model-specific seed support is verified.
[Official REST contract](https://ai.google.dev/api/generate-content).

## Compatibility with the accepted limits

| Accepted limit | Preparation / remaining check |
| --- | --- |
| 8192 combined working tokens | Count the full exact GenerateContentRequest including task, system instruction, schemas and accumulated query results; reserve the next output before dispatch. Complete framing/schema coverage and actual count-to-usage agreement remain unverified. Bytes are diagnostic, not a claimed token count. |
| 1024 generated tokens per response, including reasoning | Send maxOutputTokens at most 1024, reduced to the remaining cumulative allowance. Require usage counts and reject overruns. Actual route behavior remains unverified. |
| 6144 total generated tokens | Add candidatesTokenCount and thoughtsTokenCount once; reserve the next request from the remaining allowance. Unknown/inconsistent counts stop further requests; no post-response threshold substitution. |
| Reasoning | MINIMAL is not guaranteed zero thinking; the inclusive hard output cap is the bound. Never store hidden thought text/signatures. |
| 12 model turns / 10 tools | Hard host limits; single-shot admits one generation and no tools. Invalid tool attempts count. |
| 50 rows / 160 query characters | Unchanged accepted scoped tools validate pagination, time and argument shape. No generic file/URL/execution tool. |
| 180s request / 900s investigation | Pure ledger returns monotonic deadlines. Real transport cancellation/timers are unfinished; no remote compute-time guarantee. |
| Concurrency 1 / retries 0 | Host admission rejects another in-flight request. Interrupted/unknown usage is terminal; no automatic repair or blind retry. |
| Same pinned configuration / fresh contexts | Both methods share task, common definitions and accepted schema. Query contexts are recomputed from allowed synthetic observations; caller histories/results/private fields are rejected. Fresh runtime identities and process permissions remain to be implemented/verified. |
| All 50 artifacts and failure denominator | Unchanged schedule; no scoring has run. Retain failures, blinded adjudication and the single measured change before complete Build. |

Google documents a hard output cutoff including thought tokens; a small cap may
produce empty or truncated output, which remains a failure without repair.
[Thinking/output limits](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
The documented countTokens endpoint accepts the complete generateContentRequest,
including system instruction and other steering information. No token-count API
request has occurred. [Token-count REST contract](https://ai.google.dev/api/tokens).

No contract weakening is proposed for Gemini. If an actual route cannot meet an
original requirement, stop and prepare a precise contract proposal before scoring.
The subscription-only 8192-byte ceiling and measured output thresholds are not
selected, so their pending compatibility review is not this route's next gate.

## Account and billing blocker

Google lists free-tier input/output for this model; actual project quota and API
tier still require verification. Free-tier content may be used to improve Google
products; exposure remains limited to allowed synthetic material.
[Official pricing](https://ai.google.dev/gemini-api/docs/pricing).

Bounded observation: neither GEMINI_API_KEY nor GOOGLE_API_KEY was present to the
Node process. AI Studio was signed in, but no imported project rows were visible
and the initial key page reported a network error. No project/key was created or
imported, no secret was revealed, and no billing setting changed. The account's
subscription badge does not establish the API project's tier or usable quota.
Only sanitized metadata is recorded in ACCOUNT_OBSERVATION.json.

Required setup: make a scoped key for a confirmed Free-tier project with billing
disabled available locally outside Git/chat, then verify account quota/model and
perform the bounded route/token-count checks under the recorded $0 authorization.
Do not enable billing or pay to overcome a quota error. Rate limits are per project
and current values are visible in AI Studio. [Rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits).

## Current gate

Stage 03 remains active. Host-budget fixtures and isolated request preparation
do not establish a real API investigator, durable recorder, permissions sandbox,
actual cancellation, model performance or full application checks. Those remain
unfinished alongside the separately approved exact SIMULATED intervention;
the current instruction prohibits runtime intervention. Do not infer that grant
from request authorization or stage acceptance.

Stage 03 requires "Require accepted/fresh Data and explicit provider/model/spend
conditions" and "Verify stage cannot begin without acceptance." Complete Build
evidence and its exact human gate are still required before Stage 04.
