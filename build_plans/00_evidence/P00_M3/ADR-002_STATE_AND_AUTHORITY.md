---
id: ADR-002
title: Separate semantic state, runtime execution, and operational authority
status: accepted
date: 2026-08-11
---

# ADR-002 — State and authority

## Decision

ICM is the semantic authority, EVE is the bounded execution authority, and D1
is the operational authorization and permanent-ledger authority. The UI is a
projection of all three and owns none of them.

| State | Canonical owner | D1 projection/correlation | Reconstruction rule |
|---|---|---|---|
| Case stage contract, artifact, semantic status | ICM Git | Case ID, branch, current accepted head/hash | Rebuild from trusted template plus Git history |
| Human evidence/intervention/learning review | ICM review artifact | Actor, decision, artifact hash/head, timestamps | Semantic meaning from reviewed artifact; D1 row only correlates |
| Company identity, metric definition, accepted learning | ICM `main` | Current head/hash and query projection | Rebuild from accepted Git commits |
| EVE session, run, checkpoint, cursor, cancellation | EVE | Workspace/case/run mapping and last known status | Runtime may resume from EVE; business state reloads from ICM/D1 |
| Approval authorization | D1 | Canonical row including hashes, actor, scope, expiry, consume state | Rebuild only from D1/ledger, never from an ICM review alone |
| Action intent, idempotency, reconciliation, receipt | D1 permanent ledger | Canonical operational state | Rebuild only from D1 plus remote correlation |
| Versioned fixture/provider observation | Source adapter/read model | Immutable D1 observation and hash | Rebuild from versioned fixture or provider snapshot |
| Measurement arithmetic/result | Deterministic calculation artifact in ICM | Input hashes, metric version, window IDs, result projection | Recalculate from versioned inputs; reviewed meaning remains ICM |
| Agent trace/tool spans/token cost | EVE/Agent Runs | Trace link and bounded summary | Diagnostic only; never reconstruct business authority from trace |
| Lab publication authorization | D1 | Published artifact hash, actor, state | Public copy only from exact reviewed sanitized artifact |

## Human review versus operational approval

The canonical intervention review artifact contains the human-edited semantic
proposal and canonical `ActionSpec`. It does not authorize a side effect.

D1 approval stores at minimum:

- authenticated actor, workspace, case, gate, target, and policy version;
- canonical ActionSpec hash;
- reviewed ICM artifact blob hash and Git head;
- issued/expiry/revoked/consumed timestamps and decision reason;
- idempotency key and expected external effect class.

Execution re-authenticates the actor and workspace, reloads the current ICM
artifact/head through `IcmRepository`, recalculates all hashes, reloads policy
and action state from D1, and compares them with the approval. Any mismatch,
missing object, expired/revoked approval, or ambiguous prior attempt enters a
visible fail-closed reconciliation state. Neither store overwrites the other.

## Composite UI lifecycle

The UI derives semantic labels from the accepted ICM head and operational
labels from D1. For example, an intervention may be semantically approved in
ICM while the action is operationally `expired`, `revoked`, `executing`, or
`requires_reconciliation` in D1. The UI shows both; it never compresses them
into one mutable `status` field.

## Rejected alternatives

- ICM review alone authorizes execution — rejected because review is semantic,
  not a current server authorization.
- D1 owns full artifact Markdown — rejected because it becomes a second Company
  Brain and creates bidirectional reconciliation.
- EVE session state owns case progress — rejected because sessions/traces can
  expire and runtime versions can change.
- UI state advances the lifecycle — rejected because refresh and tampering must
  not create business state.
