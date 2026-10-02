# Gemini runner contract — original accepted B01 limits

Selected: `gemini-3.5-flash-lite`, stable model identifier; Node 22.15 native
fetch/AbortController, child-process permissions and SQLite. No SDK, installation,
download, paid fallback, native provider tools, deployment or runtime effect.
Both methods use temperature 1, MINIMAL thinking, includeThoughts=false,
candidateCount=1, text-only JSON, original frozen task/common definitions and
host schemas. Seed support is unverified; use fresh replicate indices 1/2/3.

The owner confirmed the key's associated Free-tier project, billing disabled
and sufficient quota on October 2. ACCOUNT_ATTESTATION.json records this human
confirmation, not an independent billing API receipt. Read Windows User
GEMINI_API_KEY into a host child's environment only in memory. The investigator
never receives the key, headers, unrestricted environment or credential reader.

| Accepted bound | Enforced runner behavior |
|---|---|
| 8192 combined working tokens | Before each generation, count the exact complete GenerateContentRequest and independently count its entire canonical serialized body, including all task/schema/query-result fields, using the pinned provider tokenizer. Admit only max(these two measured counts)+256 framing reservation+next output cap <=8192. No byte estimate authorizes generation. Usage above the admitted complete bound terminates the run/batch. Count failures stop before generation; context overflow is a retained failure, with no truncation. |
| 1024 output including reasoning | Wire maxOutputTokens <=1024, reduced to remaining cumulative generation; MINIMAL never means assumed zero thinking. Count candidatesTokenCount+thoughtsTokenCount once. Unknown/inconsistent or excessive counts stop; MAX_TOKENS/empty/truncated output is retained without repair. |
| 6144 cumulative generated tokens | Each investigation owns a fresh host ledger and commits every lease/usage result. The next wire cap is min(1024,6144-known generation). No request after unknown usage or exhausted allowance. |
| 12 turns / one single-shot generation | Host lease admission counts generations; token-count requests are separately recorded and never create a repair generation. |
| 10 tools, invalid attempts included | Persist each returned query intent; validate exact schemas/scope/time/cursor. An eleventh intent is recorded as budget-denied and is never executed. |
| 50 rows / 160 query characters | Original accepted scoped tool validation, exercised inside the restricted process. |
| 180s request / 900s investigation | Monotonic deadlines; race HTTP and bounded response streaming against abort timers; same investigation deadline also bounds all counts, worker phases and turns. Unknown post-dispatch usage is terminal/indeterminate, never automatically replayed. |
| Concurrency 1 / retries 0 | Sequential schedule, transport busy admission, one immutable execution claim, no retry loop. Interrupted stores reopen for validation/terminal recording only; no forgotten-budget resume. |
| Isolation | Exact source-file read allowlist, no inherited secrets, no file writes or child-process grant. Model sees only allowed synthetic observations/task/schema and current-run bounded query results. No evaluator/private world/rubric/development chat/prior-answer imports or protocol fields. Node 22 permissions are not a general same-user OS/network sandbox; no model code is evaluated or network/file/effect tool exposed. |
| Durability / preservation | Separate new benchmark SQLite stores; scoped foreign keys, atomic FULL-synchronous append transactions, update/delete rejection, evidence validation and timeline hash checks on reopen. Original A01 stores and accepted manifests/artifacts are never migrated or rewritten. |

Current official documentation lists the selected stable model and no announced
shutdown. The thinking guide documents a hard output cutoff including thoughts;
the REST usage contract separately reports candidates and thought token counts.
The countTokens REST method accepts the complete generateContentRequest, including
system instructions and other steering information. Metadata/token checks operate
on scheduled benchmark requests only. First actual generation, if permitted,
is a scored benchmark artifact and is retained even if route/schema/usage fails;
there is no standalone smoke generation or manual-chat substitute.

- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- https://ai.google.dev/gemini-api/docs/deprecations
- https://ai.google.dev/gemini-api/docs/generate-content/thinking
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/api/tokens
- https://ai.google.dev/gemini-api/docs/pricing

No token contract amendment is selected. A discovered unsupported required limit
blocks subsequent requests and requires an exact human-reviewed proposal before
scoring under any changed contract. Generic factory acceptance supplies no runtime
authority. Full Build also needs the measured experiment, human adjudication and
separately approved exact SIMULATED intervention; that intervention remains
prohibited and NOT_RUN. Stage 04 cannot advance from this preparation.
