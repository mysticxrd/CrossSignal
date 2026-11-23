# E1 section 3: tools

Settled with the owner 2026-11-22/23 (Q1-Q25, "yes to all" twice). Q20-Q25 came from checking round 1 against the owner's Notion "AI Engineering Roadmap" (sections 2, 3 and 3's Harness Engineering deepening notes). Words follow `GLOSSARY.md`; the write decision is `docs/adr/0003-agent-proposes-code-executes.md`. Facts checked: Razorpay's MCP server README (45 tools, no webhook tools, no replay), Razorpay's fetch-all-payments docs (`count` ≤100 is the page size, not a total; `from`/`to` in unix seconds), Hamel's agentic-workflows page.

## Decisions

1. **Shapes.** Tools wrap the simulator as they would wrap Razorpay test mode: real field names and formats. Lists return a fixed 8-10-field projection, 20 rows a page, with a cursor. Fetch-one returns the full entity minus `_links` and empty fields. Every result is ≤1.5k tokens, cut at a row boundary.
2. **21 tools.**
   - Razorpay, by MCP name: `fetch_all_payments`, `fetch_payment`, `fetch_order_payments`, `fetch_all_refunds`.
   - Dashboard-shaped (no public API; the README says so): `webhook_deliveries`, `capture_settings`.
   - WooCommerce: `wc_list_orders`, `wc_get_order` (with notes), `wc_system_status`.
   - Other sources: `ga4_run_report` (two date ranges), `list_deploys`, `search_plugin_issues` (public GitHub issues, #670 and #664 among them), `list_messages`.
   - Checks: `store_revenue`, `payment_outcomes`, `compare_records`, `late_authorizations`, `webhook_delivery_stats`.
   - Helpers: `price_orders`, `wait`, `propose`.

   The sale-week calendar goes in the prompt. There is no settlements tool. Every checklist rule maps to a tool.
3. **Checks return signals, never judgements.** Numbers for the window and for the same window averaged over the prior 3 weeks; no booleans, thresholds or cause words. A lint fails any output containing a cause name or a word like "anomaly", "outage" or "bug". The defence against a tool doing the agent's reasoning is world design (gate 4), not starving the tools.
4. **Messages.** `list_messages(from, to, cursor, order_id?, email?)`: time order, 20 a page, 280 characters each, sender email and phone, an order id only if the customer typed one. No `contains`, no semantic search. Text is untrusted, and linking a message to an order is the agent's job.
5. **Wait.** `wait(hours 1-24, reason)`, never past the 7 hidden days. It returns the new "now" and counts of new records per source. Deadlines are derived from `created_at` and `capture_settings`, never given. Webhook state shows only as the delivery log and the enabled flag.
6. **Proposal** (ADR 0003). The agent has no write tools. `propose({cause: 8 names | other, cause_note, summary, evidence_ids ≤20, effects ≤6, recheck_at, side_findings ≤3})`. Code derives the kind of action from the effects; a set that matches no kind is "mixed" and fails. Effects: `capture_payments`, `mark_orders_paid`, `enable_webhook`, `update_plugin`, `rollback_deploy`, `notify`. No replay, no refunds, no cancellations.
7. **Rupees** are priced by code from the effects' targets at proposal time and graded against the same pricing of the key's affected orders. `price_orders` previews the price mid-run.
8. **Executor.** It checks mechanics only and applies all effects or none, in a fixed order: plugin and deploy, then webhook, captures, mark-paid, notify. Every refusal reason is logged. Each (effect, target) gets an idempotency key, hash(proposal hash, effect index, target id). The key is visible in the world: a WooCommerce note says "ref k_…", and the notice store rejects a repeated key. The run log records an intent before each sub-operation and an outcome after it. Recovery re-reads state before retrying.
9. **Errors and steering.** Each result is an envelope, `{result | error, note}`: the real shape inside, and outside it a note drawn only from fixed templates, which belong to the toolset version and are linted. Notes name a fix in the tool's own arguments. They give a total only where the real API gives one: WooCommerce's `X-WP-Total` yes, Razorpay no. Real argument formats, real empty shapes; a window past "now" returns empty; no rate limits or flaky errors in v1. An unseen citation is kept and tagged. A malformed proposal gets one retry, then fails.
10. **Leakage.**
    - WooCommerce ids are sequential, assigned in time order after the cause and decoy are merged in.
    - Razorpay ids are `pay_` plus 14 base62 characters from hash(world version, case seed, index).
    - Results sort by time, then id.
    - Decoys use the same shapes as causal records.
    - A leak scanner runs over every response on every case and blocks sealing.
    - Held-out cases run through the same code path.
    - B01's `truthMode` and v0.2's `access` labels never reach a result.
11. **Toolset version.** One hash covers names, descriptions, schemas, projections, caps, note templates and measured schema tokens. It goes in every run log's header and in the pre-registration. Any change to it is one harness change, measured on development cases.
12. **Packaging and run log.** An in-process registry of `{name, description, schema, handler}` with a backend interface (simulator now, test mode later); an MCP adapter can come later. Schemas meet DeepSeek's strict rules (all properties required, no extra properties, `anyOf` nulls, no `uniqueItems`). Per call, the run log records: step, tool, arguments as sent, validation outcome, result as seen, result hash and tokens, clock before and after, world-state hash before and after, and latency.
13. **Reported beside pass, never in it, fixed in code before batch one.**
    - Evidence coverage: per-cause templates, with items written into the answer key when the case is made.
    - Affected-order recall.
    - Selection: discriminating checks called.
    - Argument correctness: refusals classed by reason.
    - Unnecessary calls: a result hash repeated within the run.
    - Recovery: a later accepted call to the same tool; identical repeats count as retry loops.
    - Tokens per result.
14. **Definition cost.** About 3.6k schema tokens per model call, roughly 47k a run if uncached. No deferred loading: most tools can matter in any case. Revisit past ~40 tools or ~10k tokens.

## Overrule in a word

`fields-arg` · `issues-in-prompt` · `no-issues` · `flags` checks return booleans · `agent-writes` · `free-cause` · `semantic` message search · `bare-wait` · `mcp-now` · `settlements` · `declared-kind` · `replay` · `refunds` · `agent-prices` · `in-pass` coverage gates pass · `terse` no notes · `per-effect` keys · `keep-contains` · `flaky` 1% 503s.

## Handed to later sections

- **Generator build (section 1):**
  - emit decisive evidence per case;
  - write order notes the way the plugin does;
  - the payment entity has only `created_at`, so take authorization time from the `payment.authorized` event, and verify this in Razorpay's docs first;
  - source the dashboard webhook-log fields;
  - write the #670 and #664 issue texts plus unrelated issues for `search_plugin_issues`.
- **4 orchestration:** native tool calls or a structured next-action (the Nebius transport refuses `tool_calls` today; B01 used a JSON action loop); ~12 calls typical, 30 the cap; context growth as results pile up.
- **5 autonomy:** the approval record binds the proposal hash; expiry; whether a half-applied proposal needs fresh approval.
- **6 verification:** retry policy, the reconcile procedure, a lost-acknowledgement fault test on development cases; re-reading resulting state through the same read tools.
- **7 run logs:** how coverage and the tool metrics are displayed; executor intent and outcome records.
- **9 budget:** ~3.6k schema tokens × ~13 calls; whether Nebius discounts a cached prefix; whether the ~$0.07/run estimate included them.
- **10 harness ladder:** the toolset version is a rung variable, one change per comparison.
- **11 presentation:** the README states which tools are MCP-named, REST-shaped or dashboard-shaped.

## Files changed (uncommitted)

- `GLOSSARY.md`: check, wait, proposal, effect, toolset version, decisive evidence, evidence coverage; the answer key now names decisive evidence.
- `docs/adr/0003-agent-proposes-code-executes.md` (new).
- `.scratch/e1-design/03-tools.md` (this file).
