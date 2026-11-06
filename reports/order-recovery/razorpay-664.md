# Order recovery: Razorpay #664

**BUILT: offline refund-ordering world and code-only rivals. SIMULATED: all records, merchant answers and corrections. PLANNED: agent, exact approval, checked simulated execution and page.**

Customer hypothesis: Razorpay support/integration teams. Practitioner demand and record access remain unconfirmed.

## Public anchor and limits

[Issue #664](https://github.com/razorpay/razorpay-woocommerce/issues/664) reports a v4.8.7 reproduction: a refund handled before a delayed authorization leaves WooCommerce processing after the payment was refunded. The opposite delivery order leaves it refunded. We have not run the plugin. The reporter later identifies the harness as test mode with synthetic fixtures. Source checked 2026-11-06.

Only refund ordering is modeled here. Lost cron work and amount mismatch are separate issues. These four aftermaths are invented, not customer incidents or a measured workload. Current payment and fulfillment observations are from one simulated snapshot; webhook delivery order is history, not the current payment state. Only full refunds are supported.

Merchant records require consent; the tags do not implement access control. Queued means stoppable in this simulator. Shipped remains shipped and requires merchant follow-up; changing WooCommerce status does not retrieve a parcel or establish business recovery. Unknown shipment status requires a merchant answer before repair.

## Queue, including an already-correct control

| Order | Story |
|---|---|
| order-1 | Refund handled first; order still processing; parcel queued and stoppable. |
| order-2 | Authorization handled first; order refunded and shipment stopped already. |
| order-3 | Refund handled first; order still processing; parcel has shipped. |
| order-4 | Refund handled first; order still processing; shipment status unavailable. |

## Decisions and scoring

sync_refund updates WooCommerce to refunded, stops queued fulfillment, and flags shipped orders for merchant review. It never moves money. It refuses a payment that is not refunded or unknown fulfillment. leave changes nothing. ask receives an immediate, correct simulated merchant answer, then attempts the same checked repair. Answers are supplied only by the evaluator, never to a rival.

Cost rule B is unchanged: right 0, ask 1, wrong state 3, wrong capture 10. Capture/refund API actions are not available in this world, so wrong capture cannot occur here. The grader checks payment, WooCommerce status, fulfillment and follow-up together. Asking always costs at least 1; a wrong result costs 3. A person-only case cannot pass by guessing.

The fields script uses current payment and fulfillment records. It repairs a confirmed discrepancy, asks if fulfillment is unknown, and leaves the correct control alone. Do nothing and always ask remain comparators.

## Do nothing

| Order | Decision | Payment | Woo status | Fulfillment | Follow-up | Result | Cost | Evidence |
|---|---|---|---|---|---|---|---:|---|
| order-1 | leave | refunded | processing | queued | none | left | 3 | none |
| order-2 | leave | refunded | refunded | stopped | none | left | 0 | none |
| order-3 | leave | refunded | processing | shipped | none | left | 3 | none |
| order-4 | leave | refunded | processing | unknown | none | left | 3 | none |

**Total cost: 9.**

## Always ask

| Order | Decision | Payment | Woo status | Fulfillment | Follow-up | Result | Cost | Evidence |
|---|---|---|---|---|---|---|---:|---|
| order-1 | ask | refunded | refunded | stopped | none | reconciled | 1 | none |
| order-2 | ask | refunded | refunded | stopped | none | already_reconciled | 1 | none |
| order-3 | ask | refunded | refunded | shipped | merchant_review | reconciled | 1 | none |
| order-4 | ask | refunded | refunded | stopped | none | reconciled | 1 | none |

**Total cost: 4.**

## Fields script

| Order | Decision | Payment | Woo status | Fulfillment | Follow-up | Result | Cost | Evidence |
|---|---|---|---|---|---|---|---:|---|
| order-1 | sync_refund | refunded | refunded | stopped | none | reconciled | 0 | order-1, payment-1, fulfillment-1 |
| order-2 | leave | refunded | refunded | stopped | none | left | 0 | order-2, payment-2, fulfillment-2 |
| order-3 | sync_refund | refunded | refunded | shipped | merchant_review | reconciled | 0 | order-3, payment-3, fulfillment-3 |
| order-4 | ask | refunded | refunded | stopped | none | reconciled | 1 | order-4, payment-4, fulfillment-4 |

**Total cost: 1.**

## What this establishes

This case is deliberately solvable by structured reconciliation plus one merchant answer. It is a standard the later agent must meet, not evidence that AI is needed. There are no model calls, live changes or B01 results. The #670 world and its grading are unchanged.

Run `node scripts/run-refund-ordering.mjs` to regenerate, or add `--check` to compare without writing. The run holds state in memory and writes this report only. Repeating it starts from the frozen world; it is not durable job execution. World and private truth have separately pinned hashes. Import separation is not an OS sandbox.

Remaining question for a practitioner: when an order and refund disagree, which shipment records can support repair, and when must a person decide?
