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

The grader compares payment, fulfillment and order status. A refund does not repair a Failed order: when cancellation is required, leaving it Failed is wrong. This corrects the earlier grader, which grouped Failed and Cancelled. Already-shipped notes do not silently update that status.

Do nothing leaves every order. Always ask asks on every order. The fields script matches a later captured payment on email, amount, currency and cart within 24 hours, closes duplicates, and otherwise captures live holds for shipment. It never reads messages. Matching is a baseline heuristic, not safe live authorization.

Fields + ask on text uses the fields script on orders without messages and asks on every order with one: the planned model routing, with a person in the model's place. The words script reads messages with fixed keyword rules (refund, cancel, return my money or don't want: close; shipped, courier or dispatched: capture as shipped; try again, pay again or retry: ask). Text changes only a live hold; conflicting signals, or a non-close signal on a duplicate, ask. Its rules were written after reading these three messages, so its score here says nothing about unseen text.

Process checks are printed beside cost and never added into it. Deciding records are the evidence the evaluator's answer cites for each order; an order passes when its decision cites all of them. Extra citations are cited records outside that set; they are shown, not judged. An unneeded write is a capture the method proposed that the simulator refused or found already done. Cost B scores a refused capture on the declined control as right; in an approve-first product it would still spend a person's approval.

## Do nothing

| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |
|---|---|---|---|---|---|---:|---|
| order-1 | leave | refunded | closed | failed | wrongState | 3 | none |
| order-2 | leave | failed | closed | failed | right | 0 | none |
| order-3 | leave | refunded | closed | failed | wrongState | 3 | none |
| order-4 | leave | refunded | closed | failed | wrongState | 3 | none |
| order-5 | leave | refunded | closed | failed | wrongState | 3 | none |
| order-6 | leave | refunded | closed | failed | wrongState | 3 | none |

Fields: 6; words: 6; person: 3. **Total cost: 15.**

Process checks, not in cost: deciding records cited on 0/6 orders, missing on order-1, order-2, order-3, order-4, order-5, order-6; extra citations: 0; unneeded writes: 0.

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

Process checks, not in cost: deciding records cited on 0/6 orders, missing on order-1, order-2, order-3, order-4, order-5, order-6; extra citations: 0; unneeded writes: 0.

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

Process checks, not in cost: deciding records cited on 3/6 orders, missing on order-4, order-5, order-6; extra citations: 0; unneeded writes: 0.

## Fields + ask on text

| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |
|---|---|---|---|---|---|---:|---|
| order-1 | capture | captured | to ship | processing | right | 0 | payment-1 |
| order-2 | leave | failed | closed | failed | right | 0 | payment-2 |
| order-3 | close | refunded | closed | cancelled | right | 0 | payment-3, payment-7 |
| order-4 | ask | refunded | closed | cancelled | ask | 1 | payment-4, message-4 |
| order-5 | ask | captured | shipped | completed | ask | 1 | payment-5, message-5 |
| order-6 | ask | captured | to ship | processing | ask | 1 | payment-6, message-6 |

Fields: 0; words: 2; person: 1. **Total cost: 3.**

Process checks, not in cost: deciding records cited on 6/6 orders; extra citations: 0; unneeded writes: 0.

## Words script

| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |
|---|---|---|---|---|---|---:|---|
| order-1 | capture | captured | to ship | processing | right | 0 | payment-1 |
| order-2 | leave | failed | closed | failed | right | 0 | payment-2 |
| order-3 | close | refunded | closed | cancelled | right | 0 | payment-3, payment-7 |
| order-4 | close | refunded | closed | cancelled | right | 0 | payment-4, message-4 |
| order-5 | capture | captured | shipped | completed | right | 0 | payment-5, message-5 |
| order-6 | ask | captured | to ship | processing | ask | 1 | payment-6, message-6 |

Fields: 0; words: 0; person: 1. **Total cost: 1.**

Process checks, not in cost: deciding records cited on 6/6 orders; extra citations: 0; unneeded writes: 0.

## What this establishes

One order per aftermath, not a real mix. Totals are fixture results, not evidence that one method wins for real shops. No model or B01 score is used. A truth-driven test policy reaches cost 1, showing the grader can reach its floor; it is not a deployable rival.

The words script also reaches cost 1, so these six orders cannot show a model beating a script, and a right answer with thin citations can tie it. A held-out set of unseen #670 aftermaths, frozen before any model run, is PLANNED.

Run `node scripts/run-order-recovery.mjs` to regenerate; add `--check` to verify the committed report byte for byte. The observable world and evaluator truth have separately pinned SHA-256 hashes. Hidden truth is outside product imports; this is a code boundary, not an OS sandbox against an agent with repository access.

Practitioner question: how often do these aftermaths occur, who has the records, and what does handling each one cost?
