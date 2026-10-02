---
type: api-configuration-proposal
unit: b01-api-behavioral-benchmark
status: proposed-model-pending-review
provider: gemini
proposed_model: gemini-3.5-flash-lite
model_calls_authorized: false
paid_spend_cap_usd: 0
free_account_verified: false
api_compatibility: NOT_RUN
source_check_date: 2026-10-01
---

# Gemini configuration for offline Build preparation

The owner answered "gemini" to the provider/model question. This selects the
provider; the specific model below is a proposal. The original prohibition on
model calls and paid services remains in force. No key, account, credit or billing
state was inspected. Public documentation reads are the only network activity.

## Proposed model and wire contract

Propose the stable identifier `gemini-3.5-flash-lite`, which supports text output,
structured output and thinking, with published limits of 1,048,576 input and
65,536 output tokens. This choice prioritizes an inexpensive bounded comparison;
its investigation quality is unknown. Do not use a moving `*-latest` alias.
[Official model specification](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

Use existing Node facilities and the documented GenerateContent REST API,
`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`.
No SDK installation is needed. The prepared body uses `systemInstruction`,
`contents`, and `generationConfig.responseFormat.text` with `APPLICATION_JSON`
and a projected finding schema. This wire format is documentation-backed and
has not been submitted to the API. [Official REST reference](https://ai.google.dev/api/generate-content).

| Setting | Proposed value / known limit |
| --- | --- |
| Both model methods | Same fixed model, task, common definitions and host finding validator |
| Candidate count / output | 1 / 1024 tokens per response |
| Thinking | `MINIMAL`; `includeThoughts: false`; no numeric thinking budget |
| Sampling | Temperature 1; topP/topK omitted, provider defaults; seed omitted |
| Replicates | Indices 1/2/3; model-specific seed support unverified |
| Context / generated / turns | Host limits 8192 / 6144 including reasoning / 12 |
| Timeouts / concurrency / retries | 180s per request, 900s investigation / 1 / 0 automatic retries |
| Native capabilities | No search, code, files, URL context, remote MCP, caching or native function registration |
| Account / authorization | Uninspected; model requests disabled; USD 0 paid ceiling |
| Provider revision / usage / charges | Runtime values unavailable with explicit reasons; no invented fingerprint or free allocation |

Google recommends the Gemini 3 default temperature of 1.
[Official generation guidance](https://ai.google.dev/gemini-api/docs/generate-content/gemini-3).
Minimal thinking is supported for Flash-Lite but does not guarantee zero thinking.
The provider documents that the output cap includes thought tokens and can yield
truncated or empty answers. Retain such failures; do not enlarge the Spec's cap
or silently retry. Thoughts and signatures are excluded from the sanitized
response; counts are retained. [Official thinking and output-limit contract](https://ai.google.dev/gemini-api/docs/generate-content/thinking).

## Offline adapter and schema projection

`db/benchmark/` contains byte-identical copies of accepted public contracts,
schemas, exposure codec and task. Accepted Data remains immutable. The pure
request builder validates scope, hashes, ledger and cutoff, then serializes only
allowed public observations. It offers one single-shot request, not the unfinished
multi-turn investigator. Model identity, endpoint, task and schema are host-owned.

The frozen finding schema uses `const` and `maxLength`, which are absent from
Gemini's documented schema subset. The wire projection changes constants into
typed single-value enums and reports string limits as host-only. The unchanged
host validator enforces both constraints. Request records enumerate each
projection. Wrong diagnoses, unknown citations and unsafe recommendations remain
visible for independent grading; parsing grants no effect authority.
[Official structured-output subset and validation guidance](https://ai.google.dev/gemini-api/docs/structured-output).

The response inspector retains visible output, a strict parse or explicit failure,
safe model-version metadata and usage counts. It discards provider error bodies,
thought text, signatures and arbitrary metadata. Unsupported/native response
parts, multiple candidates, malformed or truncated output, missing required
usage and token/context overruns terminate visibly. HTTP-error classification
uses fixture data only. There is no credential lookup or executable HTTP dispatch;
`callGemini()` always rejects, including caller-supplied approval/free-tier flags.

## Context and spend remain unverified at execution

Five exact prepared request bodies are in `PREPARED_REQUESTS.json`. Their serialized
sizes are 6109–6842 bytes. Each fits 8192 after adding the 1024 output reservation
and 256 framing units **only under the byte-fallback bound**. No Gemini tokenizer
or framing count was measured. Future accumulated tool contexts also require a
real check before each dispatch. The documented token-count operation is an API
request and was not invoked under the present no-call constraint.
[Official token counting](https://ai.google.dev/gemini-api/docs/tokens).

As checked October 1, the Standard pricing table lists free-tier input/output and
paid rates of USD 0.30 per million input tokens and USD 2.50 per million output
tokens, including thinking. This does not establish this owner's account tier,
available quota or absence of paid fallback. Pricing is recorded for review,
not spending authorization. [Official pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Review decisions and next work

Review the proposed model/configuration first. Any later request authorization
must explicitly supersede the present no-model-call instruction and identify a
verified free account with no paid fallback at USD 0, or provide an explicit paid
budget and account scope. Keep secrets outside the review packet and Git.

After those execution conditions are explicit, complete the durable read-only
store, bounded host-query loop, configuration/schedule freeze, three baselines,
separate blinded grading and development-only measured change. The exact
SIMULATED human intervention remains a separate authority decision; this packet
contains no executable proposal, approval grant or effect.

Per Stage 03 CONTEXT: "Require accepted/fresh Data and explicit provider/model/spend
conditions." This preparation satisfies only the offline subset. Build verification
and its human gate remain blocked; Stage 04 cannot begin.
