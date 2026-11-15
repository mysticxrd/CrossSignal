# Order-recovery model options

Approved by the owner on 2026-11-15 with "build" after the design discussion.

## Decision

Add Gemini and Nebius DeepSeek selection to the order-recovery command first.
Gemini remains free tier only. The owner permits up to $25 total Nebius usage
for this task, funded by existing credits. Reserve the maximum estimated
request cost before each send, including retries; persist reservations across
restarts. Stop on ambiguous timeouts. No automatic provider fallback.

Target Gemini `gemini-3.5-flash-lite` and Nebius
`deepseek-ai/DeepSeek-V4.1-Flash-1017`. Verify the Nebius model's availability,
pricing and request contract before live dispatch. The November deprecation
notice lists the older V4.1 Flash ID as retired on November 9:
https://docs.tokenfactory.nebius.com/november-2026-deprecation-notice.md

## Flow and authority

Select a provider, load the public simulated world, send the same task,
evidence and required answer format, validate decisions and citations, save
the response and run metadata, then score separately with the existing
evaluator. Model output is a recommendation. No real payment execution,
Case lab changes, deployment or held-out access is included.

Recordings live in gitignored `outputs/order-recovery-model/`, one immutable
directory per run ID. An atomic claim prevents duplicate dispatch. Persist
request and response before the terminal result; an incomplete directory
blocks reruns. Only the active request is in memory. Provider secrets come
from environment variables, never from prompts or recordings.

The spending ledger lives in the repository's shared Git directory so removing
a worktree cannot reset it. All task runs and worktrees share its $25 ceiling.

On save failure after a response, keep the claim/reservation and do not resend.
On malformed output, store an invalid-response result without decisions.
On timeout, stop without releasing an uncertain spend reservation. At high
load, serialize calls; queue time grows rather than provider concurrency.

## Slices

1. **Record provider-selectable #670 decisions.** Shared prompt, required
   response schema, host validation, immutable recordings and offline CLI.
   Supplied fixture responses only; no provider credentials or network path.
2. **Enable bounded Gemini and Nebius calls.** Live transports, secret
   redaction, model/usage/timing metadata, durable Nebius spending controls,
   existing Gemini free-tier checks and bounded HTTP retries.
3. **Compare both models across #670 and #664.** Refund-ordering contract
   and comparison reports for correctness, citations, latency and usage.

Each slice targets about 300 product lines plus its nearest tests, one focused
commit and PR. The owner merges each before the next starts from origin/main.
Run the full task walkthrough after review on the last slice.

## Proof

Test provider selection, identical common inputs, invalid answers/citations,
duplicate claims, interrupted recordings and unchanged baseline reports.
For live dispatch, additionally test restart-safe reservations, retry costs,
redaction and budget exhaustion before any paid request. Run npm test, lint
and typecheck before opening each PR.

Score the same public worlds using the unchanged cost grader and show
deciding evidence cited, extra citations and unneeded writes separately.
Equal fixture inputs and recorded hashes distinguish adapter drift from
model differences. Repeated matched runs are needed before comparing model
quality; latency alone can change with provider load. All evidence supplied
is recorded, but neither exposure nor citations proves what a model read.
The public #670 fixture already lets the words script reach its floor, so it
cannot establish model superiority. Held-out orders remain sealed.

## Alternatives

Automatic retries after ambiguous timeouts may complete more runs but can
pay twice; reject them. A full Case lab provider refactor is broader than the
selected order-recovery scope. No provider replacement: explicit selection
preserves Gemini alongside Nebius.
