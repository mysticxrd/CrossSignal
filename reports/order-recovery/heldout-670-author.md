# Author brief: unseen simulated #670 aftermaths

Return one JSON object, without markdown: {world, truth, twins, controls}.
The caller appends issue #670's body, world.mjs and simulate.mjs verbatim.
You have no tools, repo, prior cases, rival policies or prior messages.
Write plausible fictional merchant/customer messages, not adversarial puzzles.
These are simulated aftermaths, not claims about actual affected customers.

Use exactly today's world schema, SIMULATED, pluginVersion 4.8.8,
payment_action authorize. Exactly 10 failed/pending queue orders; additional
completed orders may supply payment context. Every order has one payment.
Unique ids and emails use example.invalid. No hidden labels in world.
truth = {orders: [{orderId, story, tier, answer, expected}]}.
tier is fields (structured evidence suffices), words (message decides),
or person (available evidence cannot resolve intent safely).
answer = {action, evidenceIds, fulfillment only for capture}; action is
capture, close or leave. For person tier this is the underlying resolution
after a person answers, not ask. Cite every deciding record by id.
expected = {payment: captured|refunded|failed, fulfillment: closed|to_ship|shipped,
orderStatus: failed|pending|processing|completed|cancelled}.
Use only actual deciding evidence. Stories and truth stay outside world.

Set shape: at least 3 words-tier and 1 person-tier orders. twins lists at
least 2 disjoint pairs of queue ids. Within each pair payment fields match
except id/orderId/email; order statuses match; both have messages and neither
is fields-tier; expected final payment or fulfillment differs.
controls lists at least 2 fields-tier queue ids: one with a message, one
without. Vary the remaining orders naturally. Do not fit any rival's rules.

Cost B: right state 0; ask 1; wrong state or guessing on person tier 3;
a newly successful capture when truth rejects capture, or on person tier, 10.
Asks are resolved by the evaluator using answer. State equality uses payment
and fulfillment and orderStatus. A capture refused or already done counts as an unneeded
write, outside cost. Citations are also checked separately.
Every underlying answer must reach expected at cost 0 without an unneeded
write. The answer key with asks on person-tier orders must reach cost exactly
the number of person-tier orders. Do not use already-captured orders with
to_ship/shipped expectations: the simulator cannot establish them.

Stop after this draft. A structural refusal may be returned as rule names;
it is not feedback about any policy score. Never call tools or score policies.

Revision: the first draft predates orderStatus in the key. Preserve its raw
input and output; add intended status using explicit action semantics and
independently review corrections under heldout-670-policy.md before scoring.
