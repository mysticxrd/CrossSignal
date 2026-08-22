---
id: phase-00-retrospective-review
classification: retrospective-owner-visibility
status: awaiting-owner-reading
mwp_execution: false
---

# Phase 00 retrospective owner review

## What Phase 00 achieved

Phase 00 produced a technically credible foundation and a much more truthful
record of what CrossSignal was at that moment.

1. It separated the **Result-team demo release** from the full PRD MVP and
   corrected UI language that implied live behavior.
2. It made checked-in migrations authoritative, added workspace-bound database
   constraints, and exercised a two-user/two-workspace attack matrix.
3. It defined a three-part authority model: **ICM owns semantic decision state;
   EVE owns durable bounded execution; D1 owns operational authorization,
   persistence, and the permanent ledger.**
4. It proved, locally and narrowly, that pinned EVE `0.32.0` could preserve one
   fixture session across process replacement behind a signed server adapter.
5. It corrected a D1 migration failure, deployed Sites version 6 privately, and
   recorded persisted refresh and workspace-switch behavior.

Phase 00 did **not** implement the combined ICM + EVE decision loop. The deployed
product remained a truthful D1-backed shell using fixture business data. That
boundary is explicit in [`KNOWN_LIMITATIONS.md`](../00_evidence/P00_M5/KNOWN_LIMITATIONS.md).

## Where the MWP process failed

The filesystem contained milestone contracts, evidence shelves, checklists, and
status changes, but those artifacts did not give the owner meaningful real-time
visibility before consequential decisions were implemented. In other words,
the documentation control plane existed, but the human control loop did not
operate consistently.

P00-M1 is the exception: its record contains an exact, timestamped owner statement
accepting the demo release profile. P00-M2 through P00-M5 have technical evidence
and Git commits, but no equivalent pre-implementation decision packet, owner
response, or owner acceptance record. P00-M3's ADRs and the Phase 00 exit gate
use words such as “accepted” or “approved”; absent an owner record, those words
prove technical selection inside the build process, not human acceptance.

This retrospective does not repair that failure by inventing historical
participation. It makes the gap visible after the fact. It is **retrospective
owner visibility**, not MWP execution and not a new approval sequence.

## Technical verification is not human acceptance

A passing build can show that code compiles. A migration test can show that a
crafted tenant mismatch fails. A restart proof can show that EVE recovered a
session. A deployment receipt can show that Sites returned `succeeded`.

None of those facts shows that the owner understood or accepted the chosen
scope, architecture, product claim, operating cost, or user-visible behavior.
Human acceptance requires the decision to be presented before implementation,
an opportunity to correct it, and the owner's exact response to be recorded.
Phase 00's technical status may remain complete while its real-time governance
quality is judged inadequate.

## Compact comparison of the five gates

| Gate | Consequential result | Strongest real proof | Owner visibility at the time | Possible revisit |
|---|---|---|---|---|
| 1. Evaluation contract | Demo profile replaced full-MVP assumptions; claims were classified | UI truth test, frozen fixture, deferral register | **Explicit:** exact owner acceptance is recorded | Reopen for live/public/PRD-complete claims |
| 2. Persistence boundary | Migrations became canonical; tenant relationships were database-bound | Fresh/upgrade parity, attack matrix, successful D1 correction | **Not evidenced:** technical completion only | Revisit for new tables, Postgres, scale, live principals |
| 3. State ownership | ICM/EVE/D1 received separate responsibilities | Four ADRs and ownership diagram | **Not evidenced:** ADR “accepted” status is not owner acceptance | Revisit Git strategy, D1 role, retention, reconciliation |
| 4. EVE topology | Separate Node 24 service with pinned EVE was selected | Same real session recovered after local process replacement | **Not evidenced:** technical spike only | Revisit EVE version, service cost, production Workflow world |
| 5. Release baseline | Truthful Sites/D1 shell deployed privately; reset constrained | Version-6 record, 12 tests, persisted workspace switch | **Not evidenced:** no separate closure acceptance | Revisit hosting, reset, platform-real gates, availability |

## Decisions that may need revisiting

- Whether the Result-team demo profile remains the right release target once
  live customers, public claims, or PRD completeness are in scope.
- Whether one app-managed private Git repository per workspace is operationally
  and commercially preferable to another ICM storage topology.
- Whether D1 remains suitable for operational authorization and the permanent
  ledger beyond the bounded private demo, especially given the PRD's Postgres
  assumption.
- Whether a separate Node EVE service is worth its deployment and versioning
  overhead, and which production Workflow world should own durable execution.
- How ICM review hashes and D1 action approvals will actually reconcile, fail
  closed, and recover under concurrency; Phase 00 documented but did not build it.
- What trace, ledger, raw-evidence, export, deletion, and backup-retention policy
  should apply to real customer data.
- Whether the additive fixture-cycle reset and private Sites topology are still
  appropriate for the final evaluator experience.
- Whether the current tests are sufficient once EVE, ICM, live reads, actions,
  and PRD eval scenarios exist. The Phase 00 count is not an eval pass count.

## Governance correction for future phases

For each future gate:

1. **Before implementation, present the gate decision packet.** It should state
   the question, current facts, options, recommendation, effects, truthfulness
   class, risks, and exact evidence that will close the gate.
2. **Wait for explicit owner input when the decision affects scope, architecture,
   claims, or product behavior.** Technical work may investigate reversibly, but
   it must not silently choose the consequential path.
3. **Record the owner's exact decision.** Quote the response, timestamp it, bind
   it to the reviewed files/commit, and distinguish acceptance, correction,
   reconsideration, and non-response.
4. **Implement only after the gate passes.** A build agent or checklist cannot
   substitute for the named human decision.
5. **Present evidence before closing the milestone.** Show the implemented
   result, tests, deployment/runtime proof, truthfulness classification, and
   remaining limitations; technical completion and owner acceptance are recorded
   separately.

## Owner review requested now

Read this review, then the five briefs in order:

1. [`01_EVALUATION_CONTRACT.md`](01_EVALUATION_CONTRACT.md)
2. [`02_PERSISTENCE_BOUNDARY.md`](02_PERSISTENCE_BOUNDARY.md)
3. [`03_STATE_OWNERSHIP.md`](03_STATE_OWNERSHIP.md)
4. [`04_EVE_TOPOLOGY.md`](04_EVE_TOPOLOGY.md)
5. [`05_RELEASE_BASELINE.md`](05_RELEASE_BASELINE.md)

After reading everything, provide **one consolidated response**: `understood`,
`understood with corrections`, or `requires reconsideration`. This is not a
request to re-approve any historical gate individually.
