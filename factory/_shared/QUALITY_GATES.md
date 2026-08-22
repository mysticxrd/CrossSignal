---
type: factory-reference
scope: all-stages
---

# Universal quality gates

Each stage contract adds stage-specific checks. These rules apply everywhere
and are linked rather than repeated.

## Product truth

- Every fixture, test provider, simulated timeout, and compressed time window
  is labeled at every user-visible and evidentiary surface.
- UI and release claims resolve to persisted state, a real runtime result, or a
  clearly labeled fixture. Static copy is never presented as live proof.
- Unverified integrations, exactly-once delivery, or causal claims are release
  blockers.

## Context and provenance

- A run consumes one immutable context snapshot with source versions, hashes,
  access decisions, retrieval details, and an ordered manifest hash.
- Each stage output records its exact input paths and hashes. Undeclared context
  loads make verification fail.
- Conclusions cite evidence IDs; hidden chain-of-thought, secrets, bearer
  tokens, and unrestricted sensitive payloads are never stored.
- A recurring correction changes the source contract or stable reference after
  human approval; it is not patched repeatedly in downstream output.

## Authority and tenant safety

- Every durable row and external effect is bound to a workspace.
- Server code derives actor and workspace from authenticated authority; models
  never choose identity, credentials, policy, or filesystem roots.
- Consequential effects require a canonical immutable intent, current policy
  decision, and when required an unexpired one-time approval bound to the exact
  displayed payload and context/policy hashes.
- Changed, stale, replayed, cross-tenant, or directly invoked authority fails
  closed and leaves visible evidence.

## Durability and recovery

- Retries and duplicate ingress preserve progress and create no duplicate
  canonical event or confirmed external effect.
- Completed graph nodes survive interruption; recovery reruns only incomplete
  work under stable identities.
- A possible post-dispatch timeout is `indeterminate` and requires
  reconciliation or a new intent and approval.
- Corrections and late outcomes append superseding records; prior history is
  never silently rewritten.

## Verification

- Run the exact commands named by the stage and record command, timestamp,
  environment, exit code, and relevant output in `output/VERIFY.md`.
- Cover the happy path, primary negative path, tenant isolation, authority
  mutation/replay, interruption, duplicate/out-of-order input, and secret
  leakage wherever those risks exist.
- A functioning UI is not runtime proof. Required preview or live probes must
  produce a resolvable trace, receipt, or observation.
- Build, lint, tests, migrations, and diff inspection pass before a gate opens.

## Human gate

- Verification opens the gate; it never accepts it.
- `output/HUMAN_GATE.md` records the decision, reviewer, timestamp, reviewed
  artifact hashes, verification hash, corrections, and one of `accepted`,
  `changes-requested`, or `rejected`.
- The next stage reads the human-edited outputs and accepted gate. It never
  infers approval from checklist progress or file existence alone.
