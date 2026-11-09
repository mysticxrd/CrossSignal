# Held-out #670: B1 commitment

Owner decision, revised 2026-11-09: resolve intent from available evidence;
ask one specific question and hold the proposed action only if uncertainty
remains. Reviewer disagreement does not establish a need for a person.
One author, one independent reviewer and deterministic checks are sufficient.
Owner reviews architectural choices; agents handle data and implementation.

## Fixed experiment

Ten queued fictional orders, two disjoint matched twin pairs with different
graded final states, two fields controls (with and without text), at least
three words-tier and one person-tier order. An answer key must reach its
full intended payment, fulfillment and order status without unneeded writes.
Shape validation establishes consistency, not realism or correct labels.

Win rule unchanged: lower total cost than the best of all five frozen
comparators in every one of three runs, zero wrong captures, and deciding
evidence cited for every non-ask decision. Ties favor scripts. Losses are
published. No held-out comparator, Gemini investigation or B01 has run in B1.

## Review and freeze

The first structurally passing author draft was kept. The subscription-only
author used an empty directory, explicit system prompt, safe mode, no tools
or MCP servers, disabled customizations and no session persistence. Its
startup reported zero tools/MCP. Full input and response are retained.

One fresh reviewer, without parent history, independently read the world
and [explicit policy](heldout-670-policy.md), then saved blind answers before
opening the author's key. The same reviewer investigated discrepancies and
realism, recording cited evidence, rules, reasons and any unresolved issues.
Both original answer sets remain intact. The reviewer had file tools: its
restricted reading was instructed, not an OS-enforced access boundary.

`--compare` requires source-bound investigation, cited resolutions for every
disagreement, zero unresolved issues, realism acceptance, reachable final
states and a specific question/held action on person-tier cases. No automatic
relabeling or minimum agreement percentage substitutes for investigating.
An unsupported correction or unresolved policy choice stops acceptance.

The original key omitted expected orderStatus. Its original bytes remain
intact; a documented migration adds author-intended status using explicit
action semantics, then independent review corrects labels before scoring.
Each investigation is bound to original author/reviewer hashes; the final
key and resolution record receive their own hashes. Cases were not replaced.

`--pin` commits reviewed bytes; `--check` refuses local changes and
`--check-public` also verifies the public commitment. B1 publishes only
the resulting hash manifest. Freeze the step-3 prompt, request construction,
schema and routing on seen data next. B2 then publishes original drafts,
both label sets, corrections, review evidence and the first rival scores.
No case addition or correction is permitted after evaluation begins.

## Scoring repair and limits

The existing #670 fixture now has explicit expected order statuses. The
unchanged Do nothing policy costs 15 instead of 9 because leaving required
cancellations Failed is wrong even after refund. All other policies remain
unchanged. Missing evidence and unnecessary writes remain separate checks.

The read-only simulation review records clarification questions and held
actions; a live approval/execution workflow remains outside this slice.
Paid spend is prohibited. Model agreement is not independent ground truth;
these are fictional cases, with no claim about customers or real performance.
Hashes establish consistency and publication order, not private non-access.

## B1 evidence

The reviewer recorded three action differences, one capture-fulfillment
difference and ten deciding-evidence set differences. Ten cited investigation
records resolved those discrepancies; zero remain unresolved. Realism review
accepted the existing stories. Original cases and both answer sets were kept.
The final private artifact check passes; [public hashes](heldout-670.commitment.json)
are fixed before any held-out comparator scoring or model evaluation.

Build proof: `npm test` passes 437 offline tests; `npm run lint` passes.
The focused suites cover the cancellation regression, unresolved review,
missing resolution evidence, stale source/review bytes, public commitments,
schema failures and refusing case storage inside any Git checkout.

Code-review fixes: reject identity fields inside answer objects, preserve
the asked order's ID during grading, and compare twin values independently
of JSON property order. Three regression tests failed before these fixes
and pass after them. Only source-code pins changed; the case commitment
remains byte-identical to B1's first published manifest.
