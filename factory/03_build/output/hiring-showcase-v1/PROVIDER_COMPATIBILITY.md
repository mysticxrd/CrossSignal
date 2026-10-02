# Gemini compatibility — requests remain blocked

Checked October 2, 2026. Selected model stays **gemini-3.5-flash-lite**.
Google's [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
lists this stable identifier, text output, structured output and thinking, with
1,048,576 input and 65,536 output capacity. The
[deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations)
has no announced shutdown date for it. Capacity exceeds the benchmark's limits;
that does not prove the configured request can enforce them.

The [pricing page](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite)
lists free standard input and output, including thinking, for this model.
The owner's existing project confirmation and sanitized ACCOUNT_ATTESTATION.json
remain preserved: Free tier, billing disabled, sufficient quota and a User-level
GEMINI_API_KEY. This pass did not read or print the key and made no provider
request. These public sources do not independently verify an account's remaining
quota. The eventual schedule must fit its existing Free request/token/rate
allowance, including counting calls. No paid fallback or native grounding.

## Original limits retained, with explicit proof limits

- Context: 8192 tokens for serialized task/schema/history plus next output.
  Existing transport counts both the full request and serialized body before
  each dispatch and uses a conservative bound. Its actual earlier largest
  initial bound was 2593. Offline overflow tests block generation. Real
  accumulated-context generation has not succeeded.
- Per response: 1024 generated tokens including reasoning; wire maxOutputTokens
  is 1024 or the smaller remaining investigation allowance. Cumulative cap is
  6144. Existing tests include reasoning, reject unavailable/inconsistent usage,
  shrink the next reservation and retain overruns as failures. Mocked responses
  prove host behavior; they do not establish provider hard-cap compatibility.
  MINIMAL thinking is not assumed to mean zero reasoning.
- Tools: 10 attempted read-only queries, invalid intents included; at most 50
  rows per response and 160 search characters. Frozen cutoff, typed argument,
  cursor and host workspace/Case/run scope enforcement remain unchanged.
- Turns/time/concurrency: 12 model turns, abortable 180-second request deadline,
  900-second investigation deadline, concurrency 1, automatic retries 0. Existing
  offline tests cover stalled HTTP/body streaming, concurrent calls, exhaustion
  and interruption. Unknown post-dispatch usage terminates; reload never retries.
- Isolation: fresh restricted Node worker contexts receive only validated public
  synthetic input, task/schema and bounded read-only query results. Actual
  access probes deny private truth/rubric/Spec/history, credentials, filesystem
  writes, children and fetch. No development-chat or previous-answer field is
  accepted. Host-side grading and this saved-result viewer stay outside the
  investigator. This is a restricted process boundary, not a claim of a general
  operating-system network sandbox.
- Durable recording: exclusive new database, committed request before dispatch,
  scoped evidence and append-only hash-chained terminal history. This new reader
  opens the existing SQLite files read-only and verifies source/manifest/history
  hashes and terminal equality without changing their bytes.

## Exact compatibility blocker

The earlier authorized scored generateContent request returned HTTP 400. The
transport kept status/operation but discarded the error body. No valid finding,
actual model revision or generated/reasoning usage was returned. Metadata and
successful token counts are insufficient generation proof. The exact parameter
cause remains unknown; do not call it a quota or reasoning failure.

Current [structured-output examples](https://ai.google.dev/gemini-api/docs/structured-output)
describe the interactions API. The preserved runner targets generateContent and
uses generationConfig.responseFormat. The endpoint-specific shape still needs
offline verification; this observation is not a proven diagnosis or permission
to switch endpoints. The generateContent GenerationConfig reference fetch also
timed out during this review, so it supplies no new capability proof.

Next compatible engineering work is a bounded offline review of the frozen body
and a secret-free structured diagnostic design. Any repair must keep all host
limits/schema validation and preserve the failed source/request. It needs new
source verification and a fresh immutable benchmark manifest, not a replay of
the consumed execution claim. No standalone smoke test, manual chat, model
substitution or changed evaluation schedule while the amendment is pending.

The 15-record schedule proposal is separately pending. Acceptance of its exact
scope does not repair generation compatibility or accept the Stage 03 gate.
