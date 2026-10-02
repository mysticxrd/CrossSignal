# Gemini compatibility addendum — October 2, 2026

This updates the earlier [provider review](../PROVIDER_COMPATIBILITY.md)
additively. Its failed reference fetch and unresolved observations are preserved.
The selected model and original accepted contract remain unchanged. There were
no provider requests in this continuation.

Google still lists **gemini-3.5-flash-lite**, including text, structured output
and thinking support on its [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).
The current [generateContent reference](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig)
documents `generationConfig.responseFormat.text`, the `APPLICATION_JSON` enum,
and its JSON `schema` value. The preserved endpoint need not be replaced merely
because newer examples use a different API. This establishes documented shape,
not successful execution of this benchmark body.

The [Generate Content thinking documentation](https://ai.google.dev/gemini-api/docs/generate-content/thinking)
explicitly describes `max_output_tokens` as an infrastructure hard cutoff that
includes thinking tokens. MINIMAL is supported for this model and does not
guarantee zero thinking. Truncation/empty output at the cap remains a failure;
the benchmark must account for actual candidate and thought counts.

## Original limit enforcement retained

- 8192 combined working-context tokens: the host counts the full generation
  request and serialized body before each dispatch, including accumulated
  read-only query results. Admission requires the conservative complete-input
  bound plus the next generation reservation to fit. Actual previous initial
  counts exist; successful real multi-turn generation remains unverified.
- 1024 tokens per response including thinking, and 6144 cumulative: the next
  wire reservation shrinks with the remaining allowance. Host accounting sums
  candidates and thoughts, rejects unknown/inconsistent usage and terminates
  on overrun. The documentation now supports the combined hard-cap meaning.
- At most 12 model turns, one for single-shot; 10 tool attempts including
  invalid intents; 50 rows per response; 160 search characters. Frozen cutoff,
  typed arguments and host-bound workspace/Case/run authority remain unchanged.
- 180-second requests and 900-second investigations; concurrency one; automatic
  retries zero. The existing abortable transport encloses the new diagnostic
  reader. Unknown post-dispatch usage terminates visibly without automatic replay.
- Fresh restricted workers accept only public synthetic observations, task,
  schema and current-run bounded read-only results. Private truth, rubric,
  previous answers, development context, credentials and new host packet files
  remain inaccessible. No native grounding, code, file, browser or write tools.
- Exclusive new stores commit the bound request before dispatch and retain
  scoped evidence, terminal failures and hash-chained history. Existing databases
  are read-only for inspection. No current runtime store was written.

## Small adapter and proof limits

`wire.mjs` adds `type: string` only where the frozen wire schema has a nonempty
enum of strings without an explicit type. Enum membership already implies that
type. Host schema validation and every generation setting remain unchanged.
Both the actual request hash and byte count are recomputed **before** the two
token counts, budget lease and committed request record. Ten fresh restricted
preparations reproduce the new initial hashes.

`diagnostics.mjs` reads at most 8192 error bytes within the original deadline.
It discards raw bodies, descriptions, messages and unknown fields. Returned
fields come from a host-built allowlist of the actual request, never arbitrary
provider prose. Secret echoes discard diagnostics. Offline tests cover malformed,
oversized and stalled streams, terminal recording and zero retries.

This enum normalization is a compatible candidate repair, **not a proven cause
or resolution of the retained HTTP 400**. That request's error body was discarded.
No actual generation revision, valid answer or candidate/thought usage was
obtained. The original failed request/source/claim stay immutable. Shape and
cap documentation close those two documentation gaps; full generation
compatibility remains unresolved. Requests stay blocked.

## Credential and Free-allowance boundary

[Sandbox observation](KEY_AVAILABILITY.json) could not see the key. The separate
[host observation](KEY_HOST_AVAILABILITY.json) confirms the Windows User key is
present, while the inherited Process variable is absent. An eventual verified
host launcher must load the User value only into its own process; presence alone
must not enable dispatch. Neither check printed, logged or saved its value.

The owner's existing Free-tier/billing-disabled/sufficient-quota attestation is
preserved. No account/quota HTTP request was made here. The accepted conservative
schedule ceilings remain 65 generation dispatches, 150 counting calls, one
metadata GET and 35840 generated tokens. Counting/rate allowance and current
remaining quota must cover execution. A quota, eligibility, isolation, limit,
compatibility or preservation uncertainty stops the batch. No paid route,
purchase, fallback, standalone smoke test or manual-chat substitute is allowed.
