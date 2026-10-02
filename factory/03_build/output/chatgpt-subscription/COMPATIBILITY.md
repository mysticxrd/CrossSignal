# Accepted limits versus the subscription route

Comparison is against unchanged Spec hash
`e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e`.
None of these findings changes the accepted contract.

| Accepted condition | Finding and required enforcement |
| --- | --- |
| 8192 working tokens: serialized task/schema/history plus next output | Incompatible as a hard combined ceiling: no enforceable next-output reservation. Provider tokenizer/framing is also unverified. Byte estimates are diagnostic, not token proof. |
| 1024 output tokens per response, including counted reasoning | Incompatible: SIWC does not accept `max_output_tokens`. Usage after completion can identify overshoot, but cannot prevent it. Cancelling after visible deltas cannot bound unseen reasoning. |
| 6144 generated tokens per investigation; no unlimited opaque reasoning | Incompatible as a hard ceiling. `low` reasoning is not a numeric cap. First/subsequent responses can exceed the remaining allowance before counts arrive. |
| Reasoning and cached usage; unknown is null with reason | Fixture sanitizer retains `input_tokens`, `output_tokens`, reasoning subset and cached-input subset. Reasoning is included in output usage, never added twice. Actual route reporting is unverified. No hidden reasoning text is retained. |
| 12 model turns maximum | Host can enforce before each dispatch, counting failed attempts; durable investigator loop is not implemented yet. |
| 10 tool attempts, invalid attempts count | Accepted session limits and preparation validate/count up to 10. Recomputed scoped results; no provider-native tools. Durable loop/exposure recording remains pending. |
| 50 rows per query, scoped pagination | Exact accepted Data tool code copied into the host surface. Tests verify query scope, time and malformed/foreign arguments. No retrieval outside the supplied synthetic universe. |
| 160 query characters | Unchanged accepted host validation; wire strings alone are insufficient. |
| 180 seconds per request, 900 per investigation | Enforce monotonic host deadlines with abort and stop recording. Transport/timers not implemented. Cancellation bounds client waiting, not guaranteed remote compute; incomplete/timeout usage remains unknown and blocks another call. |
| Concurrency 1 | Enforce a single host in-flight request and serialized refreshes; no automatic parallel model calls. Coordinator is pending. |
| Retries disabled; no single-shot repair | Configuration has zero automatic retries; malformed/failed output terminates. Token refresh before dispatch is authentication, not an inference retry. No retry after ambiguous dispatch. |
| Same pinned model/configuration for both model methods | Proposed slug `gpt-6.1-sol`, low reasoning. Account catalog and route response model identity must confirm it. Record revision/fingerprint as null if unavailable; reject silent model fallback. A changed provider is a distinct experiment. |
| Supported sampling/reasoning/seed settings | Temperature/top_p unsupported on SIWC; omitted for both methods. Low reasoning supported by model docs. Seed support unverified; use replicate indices 1/2/3 unless later proven supported. Freeze before scoring. |
| Three fresh replicates per model/case | Schedule unchanged; each request reconstructs this investigation only. No prior answers, conversation or response IDs. No scored runs have occurred. |
| No-paid-call/$0 conditions | OAuth avoids separate API-key billing, but alone does not prove zero credit use. Desktop Plus/no-credit observation is insufficient: verify own eligible client, plan-use scope, available allowance and app credit access disabled/zero. Stop on quota; never buy credits or switch billing. |
| Full eager evidence fits before scoring | All five prepared eager requests are retained without decisive-fact omission. Actual tokens remain unknown. Tool initial bodies and accumulated contexts have separate measurements; oversized contexts terminate, never silently truncate. |
| Structural output, failure denominators and isolation | Strict output format plus unchanged host finding validator. Fixture SSE tests cover terminal failure/incomplete/interruption/missing usage. These are protocol tests, not investigator answers or grades. OS isolation/probes, durable transcripts, all 50 artifacts and blinded adjudication are pending Build work. |

Prepared body sizes and every exact synthetic request are in
`PREPARED_REQUESTS.json`. Five eager bodies are 6108–6841 UTF-8 bytes; all tool
initial bodies are 7390 bytes. A ten-query stress reconstruction is 22940–25740
bytes and explicitly exceeds the proposed byte profile. Even the tool initial
body fails the earlier conditional byte-plus-1024-plus-256 estimate. No tokenizer
or provider-context equivalence is claimed; the original guarantee is blocked.

Relevant official sources:

- [SIWC limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations): unsupported limits/sampling fields and required stateless streaming.
- [Reasoning usage](https://developers.openai.com/api/docs/guides/reasoning): output usage includes reasoning and may be exhausted before visible text.
- [Model capabilities](https://developers.openai.com/api/docs/models/gpt-6.1-sol): low reasoning is supported; none/minimal are unavailable.
- [Account-specific catalog](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference): select with the same OAuth grant used for inference.
- [Usage conditions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions): shared Plus allowance and per-app plan/credit settings.

The general Responses input-token counting endpoint is not documented for SIWC.
It has not been called. No separate API key or new tokenizer package is used to
work around that uncertainty. A concrete alternative contract is proposed for
human review; the hard-bound contract remains authoritative until then.
