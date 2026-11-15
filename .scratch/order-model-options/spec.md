# Order-recovery model options

Approved by the owner on 2026-11-15 with "build" after the design discussion.

Slice 3 planning amendment, 2026-11-15: add generation-token-limit selection
before the final comparison. This amendment authorizes planning edits only;
do not start implementation or model calls under this instruction.

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
3. **Compare both models across #670 and #664.** Retain the refund-ordering
   integration and each world's grader. First choose a generation-token limit
   using repeated matched public-case runs at 8,192, 16,384 and 32,768 tokens.
   Commit the selected configuration, then run the final public comparison
   and report completion, decision accuracy, cost, citations, latency and usage.

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

### Slice 3: choose the generation-token limit first

Use public simulated #670 and #664 cases only. Before any study run, declare
the public case list, repeat count (multiple matched runs for every provider
at every limit), completion-reliability bar and decision-accuracy
non-regression rule. Use the same case/repeat schedule for Gemini and Nebius
at **8,192, 16,384 and 32,768 generation tokens**. Within each world's study,
hold the prompt, evidence snapshot/order, full response schema, provider schema
projection, model version and requested reasoning effort fixed. Only the
generation-token limit varies within a provider's matched runs. #664 keeps
its own evidence and decision contract; it does not adopt #670's schema.

Record the configured limit with each run and retry, alongside run ID, date,
provider/model version, input hashes, completion/failure status, elapsed time,
monetary cost or conservative estimate, and input, reasoning and total output
usage. Reasoning is part of the generation limit; do not count it twice.
Compare completion rate, decision accuracy, existing grader penalty cost,
provider usage cost, latency and reasoning/output usage across limits and
providers. Keep deciding citations, extra citations and unneeded writes
visible. Distinguish monetary cost from the grader's penalty score.

Truncated, empty, malformed and otherwise incomplete responses are failures,
not valid abstentions. Keep them in completion-rate denominators and show
their effect on end-to-end decision accuracy; do not report successful-run
accuracy alone. Do not assign a failed response a zero grader cost or silently
replace it with a successful repeat. Retain all attempts and HTTP retries,
including their latency, usage and reservations, in the evidence.

Choose the **smallest tested common limit** that meets the declared completion
bar for both providers without sacrificing decision accuracy against the
other tested limits on matched public cases. State the repeated-run evidence,
variability, sample size and limitations. One successful run is not evidence
of an optimum. If the bars are unmet or evidence is insufficient, report that
no supported selection can be made rather than claiming an optimum. Run the
final comparison only after the selection is supported and its configuration
is committed; use that same selected limit for both providers.

Before starting the study or final comparison, check the shared ledger's
remaining **$25 total Nebius task ceiling**, including prior usage and
unresolved reservations. Check whether the planned repeats and possible
retries fit; reserve at the actual tested limit before every send/retry.
Calibration, final-comparison calls and all retries share this existing cap.
Do not reset the ledger, release uncertain reservations or increase the cap.
If the remaining budget is insufficient, stop and report the limitation and
which planned runs/limits lack evidence; do not silently reduce repetitions.

Commit the selected configuration and its supporting evidence before any
reveal or access to held-out #670 orders. **Those orders remain sealed
throughout slice 3**, including after that commit and during the final public
comparison. Committing a configuration does not authorize held-out access.

## Alternatives

Automatic retries after ambiguous timeouts may complete more runs but can
pay twice; reject them. A full Case lab provider refactor is broader than the
selected order-recovery scope. No provider replacement: explicit selection
preserves Gemini alongside Nebius.
