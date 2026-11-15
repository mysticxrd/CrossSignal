# 03: Compare both models across #670 and #664

**What to build:** Extend provider selection to the separate refund-ordering
world. Before the final model comparison, choose a generation-token limit
from repeated matched runs at 8,192, 16,384 and 32,768 tokens on public
simulated #670 and #664 cases. Commit the supported selection, then produce
public comparison reports using each world's existing grader.

**Blocked by:** 02: Enable bounded Gemini and Nebius calls.

**Status:** done

Planning amendment, 2026-11-15: these edits authorize planning only, not
implementation or model calls. The owner subsequently requested "continue to
the next slice", authorizing implementation of this amended ticket.

- [x] #664 retains its own evidence and decision contract; neither world supplies evaluator truth to a provider.
- [x] Before study calls, declare the public case list, repeat count, completion-reliability bar and decision-accuracy non-regression rule. Run multiple matched repeats for each provider at each of 8,192, 16,384 and 32,768 generation tokens, using the same case/repeat schedule.
- [x] Within each world's study, hold prompt, evidence snapshot/order, full response schema, provider schema projection, model version and requested reasoning effort fixed. Only the generation-token limit varies within each provider's matched runs.
- [x] Record the generation-token limit with every run and retry, along with run ID, date, provider/model version, input hashes, completion/failure status, elapsed time, usage and cost or conservative estimate. Include reasoning within total generation usage without double-counting.
- [x] Compare completion rate, decision accuracy, grader penalty cost, provider usage cost, latency and reasoning/output usage across limits and providers. Distinguish grader penalties from monetary cost.
- [x] Count truncated, empty, malformed and otherwise incomplete responses as failures. Retain them in completion-rate denominators and end-to-end decision-accuracy reporting; do not report successful-run accuracy alone or replace failed runs with successful repeats.
- [x] Choose the smallest tested common limit that meets the declared completion bar for both providers without sacrificing decision accuracy against other tested limits. State repeated-run evidence, variability, sample size and limitations; do not claim an optimum from one run. If evidence or reliability is insufficient, report no supported selection.
- [x] Commit the selected configuration and supporting evidence before the final public comparison and before any held-out reveal/access. Keep held-out #670 orders sealed throughout this slice, including after that commit; the commit does not authorize access.
- [x] Before the study or final comparison, check the shared ledger's remaining $25 total task budget, including prior usage and unresolved reservations, against planned repeats and possible retries. Reserve at each actual tested limit before every send/retry. All study/final attempts and retries use the same cap. If insufficient, stop and report the limitation and missing evidence without silently reducing repetitions, resetting the ledger, releasing uncertain reservations or raising the cap.
- [x] Reports compare saved Gemini/Nebius decisions and code-only rivals on identical public inputs.
- [x] Show cost, deciding records cited, extra citations, unneeded writes, latency and usage with run IDs, dates and model versions.
- [x] Never score a failed run as a valid abstention or combine offline fixtures with actual model results.
- [x] Total Nebius task usage remains within the same $25 ceiling; held-out #670 orders stay sealed.
- [x] npm test, lint and typecheck pass; local diff review is complete.
- [ ] Whole-task walkthrough follows PR review and is required before the owner merges.
