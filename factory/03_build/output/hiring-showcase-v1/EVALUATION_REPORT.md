# Small evaluation report — current evidence and proposed study

SIMULATED · inspection only · 15-record study NOT_RUN.

## Proposed accepted-overlay study

Five existing frozen cases; one fresh investigation for each of rules, single-shot Gemini and tool-using Gemini. No case, truth, rubric, cutoff, task or limit change. Fifteen investigation records are not fifteen API requests. This unaccepted draft can use at most 65 generation dispatches and 35840 generated tokens including reasoning, plus counting/metadata requests. Quota must cover requests, tokens and rate conditions. No request is authorized by this report.

## Retained original-session evidence

Source: outputs/b01/gemini-runner-v1/session-a629b14640c9c81c
Manifest SHA-256: 96c75fe5ae30546ac10796ea55935597a47e07f55401e8a5ec8103234a9c8a7c

- Original initial schedule: 35 records; 2 retained.
- Rules: one completed finding, 16 support references, 0 contradiction references, 1 ranked hypothesis and 0 atomic claims. Citation IDs exist; semantic relevance/support has not been adjudicated.
- Single-shot Gemini: one retained failed scored dispatch; HTTP 400, indeterminate_usage, no finding or model revision.
- Tool-using Gemini: NOT_RUN.
- Metadata requests: 1; countTokens requests: 22; generateContent dispatches: 1; automatic retries: 0.
- Largest measured initial complete input bound: 2593; adding 1024 output fits 8192. Actual accumulated-context generation is unverified.
- Scored model findings: 0; independent blinded adjudication: NOT_RUN. No diagnosis/evidence/calibration accuracy rate is computed.
- These older two records are not credited toward the proposed fresh 15-record schedule.

## Failure analysis

HTTP 400 establishes a rejected generation route/request, not poor reasoning. The provider error body was discarded, so the exact parameter cause is unavailable. A committed request and terminal failure survive reload; unknown usage is retained rather than reset or replayed. No standalone smoke, model substitution or paid fallback.

The deterministic finding has no recorded counterevidence or atomic claims and only one explanation. These are inspectable coverage gaps; do not present it as a complete competing-explanation Gemini investigation. Distinguish available evidence, citation membership and semantic support. Structural parsing is not correctness grading.

Next bounded repair: offline validation of the frozen generation body and secret-free structured error diagnostics. Reverify all original limits/isolation and the verified Free allowance before any fresh scored request. No parameter cause is guessed and no failed attempt is regenerated.

## Report after amendment acceptance and execution

Keep all 15 scheduled records in denominators, including failure/abstention. Report per Case/method: diagnosis or epistemic abstention; support IDs and unsupported claims; contradictory evidence and active countersearch separately; alternatives; recommendation proportionality/authority; tool attempts and retrieved rows; latency; visible-output/reasoning/cumulative usage; provider revision/request ID; charge or its unavailable reason. Use the frozen rubric in a separate evaluator context, retain method-blinded human adjudication, and disclose the intentional eager/query compute difference. No private truth or report returns to the investigator.

One replicate per method cannot estimate variability, robust accuracy or improvement. Preserve the original development/transfer split; no tuning on transfer results. Repeated-run study and 15-record measured change stay deferred/NOT_RUN, and no runtime intervention is performed. Original B01 acceptance criteria remain incomplete.

## Read-only evidence links

- [rules: r_d564012e62fd](saved-cases/r_d564012e62fd.md) — completed; database SHA-256 95c998a4f3bc499768d3dd402a54cdba0f0753f31c1fface57587334de827ad8
- [single-shot-model: r_05af95690c5e](saved-cases/r_05af95690c5e.md) — indeterminate_usage; database SHA-256 462c4e344e1d4652e9bc13c421309ae074abeff9614050e026004e374f3e5c43

Open index.html for the readable Case projection. node prepare.mjs --replay validates/reloads the same stores; it does not infer again or repeat an effect.
