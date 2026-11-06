# Order recovery: Razorpay #670

**BUILT: offline simulator and code-only rivals. SIMULATED: every order, message and merchant answer. PLANNED: agent, approval, execution and page.**

Customer hypothesis: Razorpay support/integration teams. No practitioner has confirmed the need. This is not production-ready.

## Public anchor and limits

[Issue #670](https://github.com/razorpay/razorpay-woocommerce/issues/670) reports an authorized payment shown as Failed after the webhook job in Authorize mode. The reporter reproduced it; we have not run the plugin. The fixture anchors to the reported version 4.8.8, not a claim about the latest release.

[Capture settings](https://razorpay.com/docs/payments/payments/capture-settings) describe automatic refunds for uncaptured holds after the timeout. Here capture means taking held money; close cancels the order and lets the hold lapse. No refund API is simulated. The clock advances to eventual auto-refund, not immediate bank credit (the docs say 5–7 working days). Sources checked 2026-11-06.

All aftermaths below are invented. A second payment after a false failure is a hypothesis, not an observed customer incident. Product/cart matching data on payments is a simulated merchant integration assumption. Merchant records need consent; tags describe access, they do not implement OAuth.

## Made-up queue

| Order | Aftermath | Settled by | Relevant record holder |
|---|---|---|---|
| order-1 | Closed tab after authorization; no later activity. | fields | Razorpay (simulated) |
| order-2 | Bank actually declined the payment (control). | fields | Razorpay (simulated) |
| order-3 | Paid again for the same cart 20 minutes later. | fields | Razorpay (simulated) |
| order-4 | Asked Razorpay support to cancel and return the money. | words | Razorpay (simulated) |
| order-5 | Merchant note says the shop shipped by courier already. | words | merchant; needs consent (simulated) |
| order-6 | Told the shop they might try again tonight; no new payment yet. | person | merchant; needs consent (simulated) |

## Cost rule B: lower is better

Right = 0; asking = 1; wrong final state = 3; wrong capture = 10. These are invented costs, not money estimates. Asking uses an immediate, correct simulated merchant answer; it never earns a zero. On person-only orders, guessing is wrong even when it matches the hidden answer.

The grader compares payment and fulfillment. Closed means no shipment queued: it groups Failed and Cancelled for scoring, but the raw order status is printed below. Refunding a hold does not repair WooCommerce status. Already-shipped notes do not silently update that status.

Do nothing leaves every order. Always ask asks on every order. The fields script matches a later captured payment on email, amount, currency and cart within 24 hours, closes duplicates, and otherwise captures live holds for shipment. It never reads messages. Matching is a baseline heuristic, not safe live authorization.

## Do nothing

| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |
|---|---|---|---|---|---|---:|---|
| order-1 | leave | refunded | closed | failed | wrongState | 3 | none |
| order-2 | leave | failed | closed | failed | right | 0 | none |
| order-3 | leave | refunded | closed | failed | right | 0 | none |
| order-4 | leave | refunded | closed | failed | right | 0 | none |
| order-5 | leave | refunded | closed | failed | wrongState | 3 | none |
| order-6 | leave | refunded | closed | failed | wrongState | 3 | none |

Fields: 3; words: 3; person: 3. **Total cost: 9.**

## Always ask

| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |
|---|---|---|---|---|---|---:|---|
| order-1 | ask | captured | to ship | processing | ask | 1 | none |
| order-2 | ask | failed | closed | failed | ask | 1 | none |
| order-3 | ask | refunded | closed | cancelled | ask | 1 | none |
| order-4 | ask | refunded | closed | cancelled | ask | 1 | none |
| order-5 | ask | captured | shipped | completed | ask | 1 | none |
| order-6 | ask | captured | to ship | processing | ask | 1 | none |

Fields: 3; words: 2; person: 1. **Total cost: 6.**

## Fields script

| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |
|---|---|---|---|---|---|---:|---|
| order-1 | capture | captured | to ship | processing | right | 0 | payment-1 |
| order-2 | leave | failed | closed | failed | right | 0 | payment-2 |
| order-3 | close | refunded | closed | cancelled | right | 0 | payment-3, payment-7 |
| order-4 | capture | captured | to ship | processing | wrongCapture | 10 | payment-4 |
| order-5 | capture | captured | to ship | processing | wrongState | 3 | payment-5 |
| order-6 | capture | captured | to ship | processing | wrongCapture | 10 | payment-6 |

Fields: 0; words: 13; person: 10. **Total cost: 23.**

## What this establishes

One order per aftermath, not a real mix. Totals are fixture results, not evidence that one method wins for real shops. No model or B01 score is used. A truth-driven test policy reaches cost 1, showing the grader can reach its floor; it is not a deployable rival.

Run `node scripts/run-order-recovery.mjs` to regenerate; add `--check` to verify the committed report byte for byte. The observable world and evaluator truth have separately pinned SHA-256 hashes. Hidden truth is outside product imports; this is a code boundary, not an OS sandbox against an agent with repository access.

Practitioner question: how often do these aftermaths occur, who has the records, and what does handling each one cost?
