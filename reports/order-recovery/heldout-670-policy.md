# Evidence and review policy

Scope: fictional #670 order-recovery simulation only. Read all available
records before deciding. No real payment or merchant action is authorized.

Use explicit customer instructions and merchant fulfillment records to
resolve intent. Different wording is not automatically conflicting intent;
resolve references and sequence where the records support it. A customer
cancellation requires a cancelled order, no queued shipment and eventual
release/refund of an uncaptured hold. Leave does not cancel an order.
Confirmed shipment requires shipped fulfillment, not a new queued shipment.
An otherwise unopposed live authorized hold may be captured for shipment.
A later captured payment for the same customer/cart/amount within 24 hours
is duplicate evidence; do not capture the old hold without evidence that
both purchases are intended. A failed or expired hold cannot be captured.
Never invent a chronology, authority or customer answer absent from records.

If the available records still leave the intended action unclear, ask one
specific question and hold the proposed capture/close action. Cite the
records leaving the uncertainty unresolved. Reviewer disagreement alone is
not evidence of an unresolved customer decision.

The independent reviewer sees world.json and this policy first, with no
author labels, rival policies, prior fixtures or scores. Preserve that
blind answer file before opening the author key. Then investigate each
disagreement using records and explicit rules; retain both answer sets.
Corrections require cited evidence, a named rule and a reason. Unresolved
disagreements or unrealistic stories stop acceptance. No score-dependent
replacement, relabeling, case addition or correction is allowed.

Score all of payment, fulfillment and orderStatus. A capture for to_ship
sets processing; capture for shipped sets completed; close sets cancelled;
leave preserves the initial order status. These are explicit simulation
semantics, not claims about the live plugin. For person cases, the key
contains an underlying simulated answer after the question is resolved.
Keep unnecessary writes and missing deciding evidence separate from cost.
The winning model must beat the best of all frozen comparators in each of
three runs, make no wrong captures and cite deciding evidence for non-asks.
Claims apply only to these fictional cases; paid spend remains prohibited.
