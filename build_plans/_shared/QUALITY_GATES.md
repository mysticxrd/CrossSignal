# Universal phase quality gates

These checks apply to every phase in addition to its specific exit gate.

## Product truth

- [ ] Every fixture, simulated provider, sandbox action, and time advance is
      labeled at every place it appears.
- [ ] UI claims are backed by persisted state or a real runtime result.
- [ ] No pass count, freshness value, receipt, or connection health is static
      copy presented as live evidence.

## State and persistence

- [ ] Authoritative state ownership follows `00_PROGRAM.md`.
- [ ] New durable product state is platform-backed, not client-only.
- [ ] Schema migrations are generated, inspected, and tested from an empty
      database and the prior release state.
- [ ] Checked-in migrations are canonical; runtime initialization cannot drift.
- [ ] Retries, refreshes, and duplicate submissions lose no progress and create
      no duplicate durable records.

## Authorization and isolation

- [ ] Every new read, mutation, stream, continuation, cancellation, and export
      derives the user from server authentication.
- [ ] Workspace and case ownership are rechecked server-side.
- [ ] Two-user/two-workspace tests reject foreign IDs, stale cookies, copied
      approval data, and cross-tenant links.
- [ ] The model never selects workspace identity, credentials, filesystem root,
      or authorization policy.

## ICM and EVE boundaries

- [ ] ICM control files and schemas are immutable to imported content and model
      output.
- [ ] EVE reads only declared stage inputs and writes only declared outputs.
- [ ] Agent Runs remain diagnostic; the application ledger remains permanent.
- [ ] No business-critical state exists only in a browser, EVE session, stream,
      sandbox, or provider trace.

## Verification

- [ ] Unit and database tests cover the happy path and primary failure path.
- [ ] Relevant adversarial and interruption cases pass.
- [ ] Build, targeted lint, migration checks, and diff checks pass.
- [ ] Core keyboard, focus, labeling, and status announcements remain usable.
- [ ] The increment is deployed privately and the persisted flow survives a
      refresh, or the plan records an explicit local-only exception.
- [ ] The phase plan, program status, and traceability matrix are updated.

## Scope control

- [ ] No Phase 08 infrastructure entered the demo path without an explicit ADR.
- [ ] New abstractions have a current consumer and provider-neutral contract.
- [ ] Rollback preserves previously accepted ICM artifacts and ledger history.
