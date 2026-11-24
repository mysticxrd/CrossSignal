# E1 section 7: run logs and replay

Settled with the owner 2026-11-24 (round 1 Q1-Q8, round 2 Q1-Q16, "yes to all"). Round 2 folded in the owner's gap check against their Notion note "You Can Learn AI Agent Observability & Eval In 20 Min". Each round was checked against that note and the owner's Notion "AI Engineering Roadmap" (section 3 notes 4-5, section 5, M3) and "Learn AI Agent Harness & Loop Engineering In 19 Min" (trace as an event tree; feed failing traces to a coding agent). Words follow `GLOSSARY.md`; the record decision is `docs/adr/0007-run-logs-append-only-derived-beside.md`.

Facts checked:
- **OpenTelemetry GenAI conventions:** every span is at Development stage, in their own repository (`semantic-conventions-genai`) since v1.42.0 (June 2026). Spans: `invoke_agent` (INTERNAL), `chat` (CLIENT), `execute_tool` (INTERNAL). Cache-read and reasoning token attributes exist; there is no cost attribute; content is opt-in.
- **Cloudflare Workers free plan:** 64 MiB uncompressed bundle and 1 s startup; static assets allow 20,000 files of 25 MiB each. Today `db/replays/index.mjs` imports each bundle into the Worker code.
- **Nebius Token Factory Supplemental Terms** (effective 22 Oct 2026): the customer owns its input and output (s.3.1). The model's MIT licence is incorporated (s.2.7). Output may not build a competing service or pass as human-written where the law requires disclosure. Inputs and outputs may train speculative-decoding models unless the customer opts out (s.5.1, s.5.4).
- **Hamel Husain** (field guide, evals FAQ): a custom viewer, one-click correct/incorrect buttons and hotkeys beat lengthy forms.

## Decisions

1. **One append-only JSONL file per run, written ahead (ADR 0007).**
   - At `outputs/e1-runlogs/<batch>/<run_id>.jsonl`, each line is fsynced before the send, call or operation it announces, and a lock file allows one writer.
   - Levels come from `parent` ids: run → turn → call, and run → proposal → operation.
   - Events: `header`, `send_intent`/`send_attempt`/`send_outcome` (the outcome is the turn), `call_intent`/`call_outcome`, `nudge`, `proposal_retry`, `proposal`, `priced_proposal`, `notice`, `decision`, `op_intent`/`op_outcome` (landed, refused, `reconciled`, `approval_used`), `guard_catch`, `stop`, `resume`, `verification`, `watch_window`, `stamp`, `closed`.
2. **One hash chain.**
   - Every line carries `seq` and `prev`, the sha256 of the previous line's `canonical()` form; the header's `prev` is zeros. Intents are chained.
   - A restart closes the file with `closed{status: crashed|void, dangling}` and opens a new run whose header holds `restart_of: {run_id, head}`. The closer cuts a torn last line and records its length and hash.
   - An executor crash resumes in the same file (`resume`, then `reconciled`).
   - The chain proves only that the file agrees with itself; the manifest stamp (decision 9) anchors it.
3. **Recorded once; derived beside the chain.**
   - **Per send:** the request's sha256 and only the new messages (prompt and tools by version hash; the reader rebuilds the request and must match its hash), and the whole response: content, full `reasoning_content`, raw `tool_calls` argument strings, finish reason, usage with cached and reasoning tokens, and the model id returned. Also latency, reservation and settled cost.
   - **Per call:** tool, arguments as sent, the validation outcome, the full result text exactly as the model saw it (envelope with `as_of`, `calls_left`, note) with its sha256 and tokens, clock and world-state hash before and after, and latency.
   - **World snapshots:** hashes only; code regenerates the world from the world version, seed, clock and landed operations.
   - **Derived, never written back:** pass and its parts, coverage, tool metrics, step pre-labels (moved out of section 4's log), the transition matrix, the confusion table, cost per passing run and scans. Each derived file is keyed by `(run_id, head)`.
   - Our own fields are integers (paise, micro-dollars, ms, tokens). A log stays near 1 MB; full requests would be about 24 MB.
4. **Header.**
   - It holds: run id, batch, opaque `case_id` (`c_` + 12 hex), `set`, seed, frozen "now", attempt and `restart_of`; every version (world, harness and its three parts, policy, grader at run time, schema); the price card (decision 12); provider, model requested, effective parameters, retry policy and caps; `world: "simulated"`, git commit and dirty flag.
   - It never holds the answer key, cause, decoy, case family, paths or a username.
   - **Lints:** no header value but "now" in any request; the harness never reads `outputs/e1-runlogs/` (ADR 0004); no wall-clock value in any request; no `Date.now`/`Math.random` in the simulator or the harness's decision code; no network call but the provider's.
5. **Replay and determinism check.**
   - Every view's record pane is drawn from recorded bytes only. A separate derived pane names the code version behind each figure.
   - The determinism check (`replay --check`) re-runs each logged call at its logged clock against the regenerated world, compares result and world-state hashes, and regenerates the world at the proposal's clock for pricing. It runs after every batch, in `verify:e1` and before any re-grade, with no model call.
   - A mismatch is `replay_mismatch`: the recorded verdict stands as the record, but the run leaves the headline and comparisons and is ungradable on re-grade until a new world version explains it.
6. **Stub-model replay** (owner).
   - A fake provider returns the recorded responses while the real harness runs. It must reproduce every request's sha256, dispatch order, envelope bytes, nudge, cap, forced-proposal and status decisions, and the log byte for byte apart from wall-clock fields; it stops at the first divergence.
   - A divergence under an unchanged harness version fails `verify:e1`. After an intended harness change it reports the first divergent turn as information, never pass or fail.
   - It runs in `verify:e1` on the fixtures and the committed public replays, and locally on every archived development log.
7. **Schema evolution (ADR 0007).** Files are never rewritten. The header says `schema: N`, each version's reader is frozen, and in-memory upcasters step vN → vN+1. One fixture per version (an oracle run with a stub model in `tests/fixtures/e1-runlogs/vN/`) must round-trip byte for byte and upcast to every field the grader needs, or an explicit `absent`. A schema change adds a fixture. World versions are git tags; an old log is re-graded by regenerating from its tag.
8. **Held-out run logs.** None exist before the reveal; the runner refuses a held-out case unless the pre-registration and frozen-rungs commit is an ancestor and the sealed hashes match. Before the reveal only Codex's tools touch held-out cases, committing counts. At the reveal: run every rung (void restarts automatic), commit and stamp the manifest, then grade, then read.
9. **Archive and stamp.** `e1:archive` copies each batch to the home checkout, verifying every chain and refusing to overwrite, and pushes it to a private repository `crosssignal-runlogs`. A committed manifest, `reports/e1/runlogs-<batch>.json`, lists run id, case id, set, status, sha256, head and size; each manifest gets one OpenTimestamps proof. About 15 MB a batch.
10. **Public replays.** Masked copies ship as static assets; the visitor's browser checks the file's sha256 against the stamped manifest and then the chain (SubtleCrypto). The Worker stays a read-only gate; deploys are labelled with run id, date and model.
11. **Masking, leaks and reasoning.**
    - At export a versioned, deterministic mask covers every string (`p•••••@gmail.com`, `+91 98•••••321`), the same within a run. The masked copy is re-chained, and its header names the original head and mask version.
    - The export refuses a file holding a surviving email or phone, a key shape (Nebius, `AIza…`, `sk-…`, `Authorization`), a path or username, a held-out run before the reveal commit, an answer-key field in the record pane, or no `world: "simulated"` banner.
    - Reasoning is published whole, labelled "The model's private reasoning, as the provider returned it. The merchant never sees this."
12. **Spend** (owner).
    - The header names a **price card** from `e1/price-cards/<id>.json`; settled cost = usage × price card, in micro-dollars.
    - Per batch, run-log settled costs, void and failed runs included, must equal the shared ledger's settlements, or the batch report fails.
    - **Section 4 amendment:** force the proposal when the budget left is below the next send's reservation plus one forced proposal's; "settled ≤ cap" is then a post-run assertion, and its failure is `reservation_bound_broken`.
    - Cost per passing run = all settled batch spend ÷ passing runs. Judge spend is reported apart.
13. **Transport attempts** (owner). Each `send_attempt` records attempt number, HTTP status, full error body with keys hidden, `Retry-After`, backoff, time left, failure class and `in_context: false`. A void run's `closed` cites the attempts that voided it.
14. **Two clocks** (owner). The header holds the UTC start and every intent and outcome carries `t_ms` beside the case clock. Views derive time per turn, the slowest turn and its share, and a model/tool/harness waterfall. Wall time never enters a request, pass or the stub-model replay.
15. **Judge input** (owner; section 6 decision 7 amended). Code builds it from the run log alone: summary, priced figures and every result text the run saw, in order, cited ones marked. Each judge call goes to `judge-<grader>.jsonl` beside the chain with input hash, judge version, raw response, tokens, cost and attempts, and is cached by (input hash, judge version). A judge version change is a grader change.
16. **Cardinality** (owner). Every log has exactly one header first, then `stamp` and `closed` last; contiguous `seq`; every outcome has an intent, and dangling intents only under crashed or void. `proposed`: ≤2 proposal attempts, exactly 1 proposal, 1 priced proposal, 1 decision, op pairs unique per key within each execution attempt, ≤1 `verification`. `malformed_proposal`: 2 attempts, 0 proposals. Others: 0 proposals, every tier `not_run(<status>)`. A breaking log is `harness_error` and never reaches the grader.
17. **One counting rule** (owner). `countCalls()` in the harness version: every tool call but `propose`, accepted or refused; propose attempts apart (≤2); the nudge isn't a call; `calls_left` = 30 − calls. Metrics and views import it.
18. **Views.**
    - **Annotation view** (local): the public page's renderer, unmasked, with a header strip and hotkeys (`j`/`k`, `f` first wrong investigation step, `1`-`5` relabel, `n` note, `]` next run). Annotations go to `reports/e1/annotations-<batch>.jsonl`, keyed by `(run_id, head)`, failing runs first. If batch one averages over 5 minutes a log (target 3), cut it to the plain page plus a notes file.
    - **Public page:** record pane on the left (turns, calls, labelled reasoning, proposal, priced proposal, decision, operations, guard catches in red, a partially applied banner, the `verification` lists, the stamp, watch windows and skipped sale weeks, check modes). Derived pane on the right (grade under grader version N, coverage, tool metrics, tokens, dollars, wall time, and the answer key labelled "never seen by the agent").
    - **Query CLI** (owner): `node scripts/e1-runlogs.mjs <batch>` filters by status, failing part, failure mode, tool or case and prints slices; no database. A coding agent's case file holds the run log, verdict, the owner's annotation, answer key, prompt and tool files, the stub-model replay command and "propose one harness change, measured on development cases"; none exists without the annotation.
19. **Scans** sit beside the chain as reports, never checks: simulation-awareness keywords over reasoning and content (a confirmed hit is a world bug: fix it and re-run section 1's blind-judge gate) and injection taking effect (instruction then mirrored arguments). Held-out runs are scanned after the reveal.
20. **Observability.** The log holds every field the OTel GenAI conventions require or recommend. In M3 a pure function maps run → `invoke_agent crosssignal-e1`, turn → `chat <model>`, call → `execute_tool <name>`, the rest → `crosssignal.*`, cost → `crosssignal.cost.usd_micros`. No export.

**Already covered, confirmed:** camera vs referee (decisions 2-3); metering before and after each send (section 4); the budget ceiling (decision 12's assertion); grounded numbers (`unsupported_figure`); raw payloads (decision 3); the release gate (`verify:e1` and the grader-path rule); non-determinism (decisions 5-6 and the lints). Errors handled is covered by the recovery metric and `unread_record`. The disclosed half isn't: v1's refusals are argument errors, so an unrecovered one shows as missed evidence coverage.

## Overrule in a word

Owner's: `memory-pillar` (ADR 0004: no memory, no gate before the loop or consolidation after) · `tier-routing` (one agent model; the judge is accounted under its own role) · `fault-replay` (a stub model can't show the reaction and a live one is a paid, unscored new run; section 3 rejected `flaky`) · `no-stub-replay` · `no-attempts` · `one-clock` · `cited-only-judge` · `no-reconcile` · `no-cardinality` · `count-accepted-only` · `no-query-cli`. Mine: `sqlite-store` · `chain-per-turn` · `hash-results` · `prelabels-in-log` · `migrate-logs` · `otel-export-now` · `stamp-reveal-only` · `public-archive` · `no-backup` · `worker-bundles` · `example-domains` · `hide-reasoning` · `plain-page` · `scans-in-pass`.

## Handed to later sections

- **4 orchestration:** pre-labels leave the log; the cap trigger reserves one forced proposal (decision 12); `countCalls()`.
- **6 verification:** the judge reads every result text (decision 15).
- **8 trigger and the merchant's view:** assumed the demo runs the case clock forward only after approval and shows the same record pane, masked, with the stamp.
- **9 budget:**
  - the ledger against Nebius's own usage records;
  - judge cost (about 45k input tokens × 3 calls a run on Flash-Lite);
  - opting out of speculative-decoding training;
  - the forced proposal's reservation inside the run cap;
  - `verify:e1` staying under 2 minutes with both replays;
  - private-repository storage (about 100 MB across v1).
- **10 harness ladder:** the forced-failure replay as a never-scored diagnostic; comparisons only within one harness version; a rung's stub-model divergence report.
- **11 presentation:**
  - assumed: every held-out run after the reveal (failed ones raw) plus chosen development runs are published;
  - credit sources accurately (below).
- **Credit.** Direct from Sean's AI Stories video, via the owner's note: observability as camera and evaluation as referee, the trace-to-gate pipeline, six runtime checks, the CI release gate, and agents reading raw run logs to diagnose failures [13:21]. From the note's own audit spec (untimestamped): fixture replay (it stubs tools; ours re-runs them), a judge reading final output and raw tool outputs, errors marked as propagated into model context or not, the slowest span's share, shown-versus-metered spend, artifact cardinality and the error-injection replay. Adapted by the owner: stub-model replay, run-log cardinality, the ledger reconciliation. The owner's own: one counting rule. Also Temporal via the Roadmap (history is the truth; replay tests code against it), Hamel (viewer, hotkeys) and Osmani (old transcripts still load).

## Files changed (uncommitted)

- `GLOSSARY.md`: run log amended; new replay, determinism check, stub-model replay and price card.
- `docs/adr/0007-run-logs-append-only-derived-beside.md` (new).
- `.scratch/e1-design/07-run-logs.md` (this file).
