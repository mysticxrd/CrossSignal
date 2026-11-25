# E1 section 1: the merchant world and its causes

Settled with the owner 2026-11-20/21 (Q1-Q17, "yes to all"). Words follow `GLOSSARY.md`; the base decision is `docs/adr/0001-generated-merchant-world.md`. Reference: the owner's Notion note "How To Test AI Agents With Simulations" (Raindrop talk).

## Decisions

1. **Build.** GA4 merch-store data gives daily counts and funnel only; a seeded generator makes everything about money. Label: "real daily rhythm, simulated payment mechanics, anchored to two public Razorpay bug reports." Prepaid only (no COD), stated in the README.
2. **Real API shapes.** Tools call a simulator behind the network boundary that answers in Razorpay's documented entities and webhook events and WooCommerce REST orders, following Razorpay's lifecycle: a 3-day capture window with auto-refund (owner, 2026-11-21; cites Razorpay's capture-settings page and refunds API, which say 3 days; the FAQ and WooCommerce guide say 5, and the README names the conflict), late authorization, webhook retries for 24 h then disablement. No LLM world simulator.
3. **Revenue.** The dip is measured on store revenue; captured revenue and settled cash are evidence.
4. **Shape.** One baseline world (GA4 2 Nov-6 Dec 2020, shifted by whole weeks into 2026) plus 7 hidden future days. The Black Friday/Cyber Monday spike is "the merchant's sale week" in a calendar record. Each case = baseline + at most one cause + at most one decoy, its own seed, a frozen "now". The world changes only when the agent waits or an approved effect runs.
5. **Volume.** Orders follow GA4 purchases 1:1 (13-145/day, median ~65, ~2,300 orders). Synthetic INR catalog (~20 SKUs, median ~₹1,500); mobile ~80%; UPI ~70%, cards ~20%, netbanking and wallets ~10%.
6. **Causes (v1).** #670 plugin bug; late authorization; UPI/bank outage; deploy breaks one segment; traffic drop; webhook disablement; webhook delay (wait); no cause (normal rhythm, post-sale fall). #664 is a decoy and side finding, since it raises store revenue rather than lowering it. Two-cause cases wait for v1.1.
7. **Decoys.** Each shows another cause's surface in a source the checklist reads, does not move store revenue, starts within 48 h of the cause, and comes from a fixed list per cause.
8. **Messages.** A bank per cause family, written from public symptom descriptions, English and Hinglish, some vague. Background ~3/day; ~1 in 4 affected customers writes.
9. **Answer keys.** Written from the injection, hashed and committed before any run; each case passes the counterfactual check (no cause, no dip; no decoy, same dip).
10. **No giveaways.** Tool responses carry no simulation markers and dates agree with the frozen clock; the "simulated" label lives in README, run log and replay.
11. **World acceptance gates**, all before any model run: bug-report reproduction (#670, #664 symptoms appear), counterfactual check, solvable by the owner from records alone, not trivial for the alert-plus-checklist baseline (named failure reasons), blind judge at or below ~65% on 20 real/generated pairs. The world version is pinned and hashed; a generator change starts a new version.

## Overrule in a word

`x2` double daily orders · `ga4-mix` keep GA4's device split · `cod` add COD in v1 · `664-cause` keep #664 as a cause · `two-causes` two-cause cases in v1 · `two-decoys` allow two decoys per case · `jan` use the 5-25 Jan 2021 window instead · `llm-world` allow an LLM fallback simulator · `5-day` use the 5-day capture window.

## Handed to later sections

- **2 evals:** who authors held-out cases and their messages; number of cases and mix (20-30% no-cause); the checklist baseline's exact rules (gate 4 needs them); scoring side findings and partial credit; real samples for the blind-judge gate (GA4 weeks, Razorpay's documented payloads).
- **3 tools:** Razorpay- and WooCommerce-shaped reads that aggregate and page over ~2,300 orders; "wait" as an explicit tool.
- **5 autonomy:** in eval runs approval is a fixed rule, never a simulated person.
- **6 verification / 11 presentation:** whether to add one Razorpay test-mode run of #670 on a real WooCommerce install; the README's real-versus-simulated lines.
- **7 run logs:** a scan of traces for "this looks simulated" reasoning.
- **8 trigger:** the dip threshold, which decides which real GA4 windows become no-cause cases.
- **10 harness ladder:** comparisons only within one world version.

## Files changed (uncommitted)

- `GLOSSARY.md` (new): world, revenue, case and Razorpay-mechanics terms.
- `docs/adr/0001-generated-merchant-world.md` (new).
- `.scratch/e1-design/01-world.md` (this file).
