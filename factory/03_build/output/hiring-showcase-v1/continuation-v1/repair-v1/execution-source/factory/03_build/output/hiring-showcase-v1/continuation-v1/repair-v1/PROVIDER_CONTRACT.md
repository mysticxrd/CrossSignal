# Verified offline request contract — October 2, 2026

Selected model: **gemini-3.5-flash-lite**. The current Google
[model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
lists text, structured output and thinking. Its
[Standard pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite)
lists Free input/output including thinking. The preserved owner attestation
confirms Free tier, billing disabled and sufficient quota. No paid fallback.

## Endpoint and format repair

Keep the existing v1beta Developer API generateContent endpoint. Google's
[Developer API serializer](https://github.com/googleapis/js-genai/blob/main/src/converters/_models_converters.ts)
emits responseMimeType and responseJsonSchema in generateContentConfigToMldev.
The [Generate Content guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
also shows that pair in its Go example. Use IANA application/json. No SDK was
installed or downloaded; the local transport uses existing Node fetch.

The API reference's responseFormat MIME enum presentation differs from current
guide examples and SDK text MIME types. The old transport sent APPLICATION_JSON
inside responseFormat. That request returned HTTP 400 with no retained body.
The exact historical error cause remains unconfirmed. The new wire form follows
the explicit Developer API serializer rather than guessing an enum encoding.

The adapter also makes string-enum types explicit. Both changes preserve the
same frozen output schema and host validation. The host counts, hashes and
commits the **actual repaired body** before dispatch. Nothing is rewritten after
admission. Original failed sources, manifests, claim, database and accepted
Spec/Data remain unchanged. This engineering repair is not an improvement study.

Offline checks validate every supported schema keyword/type in all ten fresh
restricted initial requests and preserve generation settings. Actual generation
success will be measured only inside the accepted benchmark. Server rejection,
unknown/inconsistent usage, missing/changed model revision or unclear quota stops
the batch with a retained record. No smoke generation or parameter retry.

## Mandatory limits and exposure

Original limits remain 8192 complete working-context tokens, 1024 response tokens
including reasoning, 6144 accumulated generation, 12 turns (one single-shot),
10 attempted tools, 50 rows/result, 160 search characters, 180-second requests,
900-second investigations, concurrency one and automatic retries zero.

The [thinking guide](https://ai.google.dev/gemini-api/docs/generate-content/thinking)
documents a hard max-output cutoff including thoughts; MINIMAL is not zero
thinking. Count candidates and thoughts explicitly. Missing counts stay unknown
and terminate; no invented zero, byte-only admission or lowered ceiling.

Each generation re-counts the complete request and serialized body, reserves
the next output inside the context/cumulative caps and commits its bound lease.
Each preparation/parse/query uses a fresh restricted worker. Only synthetic
public observations, task/schema and current-run bounded read-only results enter
the API body. No private truth, rubric, old answer, development context, key,
file/native network tool or runtime authority is exposed. Isolation probes deny
new host files as well as original private/evaluator sources.

The local HTTP copy preserves original endpoint/counting/time/concurrency/secret
and retry code; HTTP_SOURCE_PROVENANCE records the exact limited validation
changes. Error diagnostics remain capped at 8192 bytes under the request timer
and retain only known codes/statuses and request-field names, never raw prose.

## Execution boundary

The original configuration object remains unchanged historical preparation.
Trusted execution requires a current source-bound offline proof, accepted/fresh
Spec/Data, exact accepted scope, accepted preservation qualification, unchanged
account attestation, current immutable plan and preservation pass. A caller flag
cannot enable it. Before every provider operation, check the frozen source and
index bindings again. Credentials are loaded only into the trusted host process.

The plan keeps the approved 15 identities and one replicate per case/method.
Case order is frozen; tool/rules/single-shot positions rotate, prioritizing the
owner's requested first saved Gemini investigation. Ceilings stay 65 generation
dispatches, 150 counts, one metadata GET and 35840 generated tokens. Preflight
counts concern the exact scheduled requests. A fresh immutable execution claim
prevents competing launches and replay. Saved reload never requests a model.

The new saved viewer/report will distinguish successful parsing from factual
correctness and preserve failures in denominators. Method-blinded human
adjudication remains required; full B01, the repeated study, measured change,
runtime intervention and later stages remain incomplete.
