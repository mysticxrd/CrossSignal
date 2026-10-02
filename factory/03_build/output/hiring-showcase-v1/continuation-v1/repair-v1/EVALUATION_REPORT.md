# Evaluation and failure report — October 2, 2026

SIMULATED synthetic data; one real rejected Gemini request; partial study.

The owner accepted b01-hiring-showcase-v1 (proposal SHA-256
a717d9aed1bdaeda5941b63aceffbf3e4f85f2cc3163ad3e1f4010f3f445cac2).
Five frozen cases × rules, single-shot Gemini and tool-using Gemini × one fresh
investigation produces 15 records. Older records are not credited. The larger
repeated study, measured improvement and intervention demonstration are
deferred; the larger accepted B01 milestone remains incomplete.

## Observed result

Session: outputs/b01/gemini-runner-v1/showcase-session-ad309fa3f1fff8f5.
Manifest canonical SHA-256:
fb40611d1b890a995a2a6e015ca582c252b8d9eb9cfe6057f11a1c98fa11fed8.

- Saved: 1 of 15 records; 14 NOT_RUN. The first tool-using record is
  r_4ccc5d1f707d, terminal indeterminate_usage, failure http_failure.
- Model findings: 0. No diagnosis, epistemic abstention, support or contradictory
  citations, tool retrieval, recommendation or provider revision returned.
- Actual calls: 1 metadata GET, 22 countTokens, 1 generateContent; retries 0.
  These are 24 provider operations, not 24 investigations. No smoke generation.
- All ten exact scheduled initial requests fit the original context admission.
  Largest complete input bound: 2605; reserving 1024 output fits 8192. The failed
  first generation reserved 1024 against a complete input bound of 2055.
- First investigation elapsed approximately 4628 ms. No successful multi-turn
  provider behavior, reasoning accounting or accumulated-context result exists.
- Generated/reasoning usage, provider revision and reported charge are unknown.
  The local ledger's zero known-generation counter is not measured server usage.
  Access followed the preserved billing-disabled Free-tier owner attestation;
  no paid fallback or separate purchase occurred.
- Frozen-source, scoped evidence, terminal-result and append-only history checks
  pass read-only reload. No runtime effect or intervention occurred.

Database SHA-256:
ac724d8014db1b45226695271eeca844795d8234c3a61fe688869ba8027f3524.
Timeline SHA-256:
245defa2d955b219fafa77506d35d55aac2eb10043df13d13dfbbbf6974b2ccf.
The readable Case and exact source bindings are accessible from
[the viewer](index.html) and [SAVED_INSPECTION.json](SAVED_INSPECTION.json).

## What the HTTP repair established

The original transport sent responseFormat with APPLICATION_JSON. The additive
adapter follows Google's explicit Developer API serializer using
responseMimeType=application/json and responseJsonSchema, with explicit types
for string enums. The original schemas, task, limits and host validation remain
unchanged. Every actual repaired body is counted, hashed and recorded before
dispatch. No installation or SDK download was needed.

This offline repair passed its protocol and isolation checks. The real
generateContent request nevertheless returned HTTP 400, code 400,
INVALID_ARGUMENT. The bounded retained diagnostic contains no field paths.
It discarded raw provider prose by design. The exact server rejection cause
cannot be recovered from that stored result. Neither old nor new rejection
is claimed resolved, and neither is a reasoning-quality measurement.

Google's [troubleshooting guide](https://ai.google.dev/gemini-api/docs/troubleshooting)
advises against retrying HTTP 400 client errors. Its
[structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
warns that very large or deeply nested schemas can be rejected. Schema
complexity is a hypothesis here, not a diagnosed cause. The official SDK's
[JSON-schema transformer](https://github.com/googleapis/js-genai/blob/main/src/_transformers.ts)
passes responseJsonSchema through; applying its separate OpenAPI-schema
conversion is not a demonstrated correction for this request.

The frozen runner stopped immediately. The consumed execution claim, sources,
manifest, failure and all 14 NOT_RUN identities stay intact. No request after
the rejection, model substitution, weakened cap, manual chat or paid fallback.

## Prepared diagnostic candidate and remaining review

The separate diagnostic-next candidate maps a bounded error message to one
fixed category: schema complexity, unknown parameter, schema keyword rejection,
thinking configuration rejection, output-limit rejection, or unclassified.
Provider prose, unknown fields and secret echoes are never stored. A category
is explicitly a hint, not a confirmed cause. The 8192-byte bound, abort signal,
fixed route, original request/lease binding and zero retries remain enforced.

The candidate is tested only against offline fixtures and is not imported by
the frozen execution transport. The exact pending
[diagnostic proposal](PROVIDER_DIAGNOSTIC_PROPOSAL.md) requests review of a
compatibility-prerequisite exception for one unused scheduled single-shot
record. Without acceptance, further model requests remain blocked.

## What can be discussed in an interview

Implemented mechanics include fresh scope/context isolation, bounded queries,
token admission, abortable transport, write-ahead dispatch recording, immutable
source provenance and read-only reload. Offline fixture orchestration exercises
all 15 records and actual restricted worker denials. These support software
claims; they do not substitute for a successful Gemini investigation.

Independent semantic adjudication is NOT_RUN. Keep the rejected record and
NOT_RUN work visible in the 15-record denominator. Do not compute accuracy,
improvement, calibration or business recovery. One replicate per method would
not estimate variability even after completion. Preserve the accepted
development/transfer distinction and evaluator isolation when resuming.

Stage 03 Build remains incomplete/pending. No later stage or runtime grant is
inferred from this report, the accepted scope or the preservation qualification.
