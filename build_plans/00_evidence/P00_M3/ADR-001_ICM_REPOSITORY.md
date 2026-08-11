---
id: ADR-001
title: App-managed private Git repository behind IcmRepository
status: accepted
date: 2026-08-11
supersedes: null
---

# ADR-001 — Canonical ICM repository

## Decision

Use one app-managed private Git repository per CrossSignal workspace. Product
code reaches it only through a server-side `IcmRepository` interface. The
initial demo remote is provisioned under an application-owned private Git host,
never in a customer's repository and never from the browser or EVE sandbox.

The provider is an adapter detail. Workspace code stores only an opaque
repository reference, default branch, and expected heads in D1; Git credentials
remain in the repository service. A portable Git bundle/Markdown export keeps
the decision record inspectable if the initial host changes.

## Repository rules

- `main` owns accepted Company Brain state and immutable templates/control files.
- Each case writes only its case branch and declared artifact paths.
- Human reviews are canonical ICM review artifacts committed with actor,
  prior/new content hashes, base head, and review outcome.
- Shared brain changes are proposed as diffs. A workspace lease plus
  compare-and-swap against the reviewed base head is required to merge.
- Imported content and model output cannot write `_system/`, schemas, tools,
  policies, connection definitions, or credentials.
- Git commits are semantic history. D1 stores projections and operational
  correlations, not duplicate Markdown bodies.

## Interface boundary

`IcmRepository` is an application-owned server interface with operations for:

- stamping a case from a trusted template;
- reading only a stage's declared inputs and allow-listed references;
- committing a candidate artifact to the current case branch;
- committing a human review artifact and returning its content hash/head;
- preparing a Company Brain diff against a named base head;
- merging only the exact approved diff after compare-and-swap;
- exporting a case/workspace with a manifest and hashes.

Workspace identity, repository root, branch, path allow-list, and credentials
come from authenticated server context. They are never tool arguments chosen by
a model.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Store ICM Markdown as D1 blobs | Creates a second opaque Company Brain and loses native Git inspection/portability |
| Treat an EVE sandbox checkout as canonical | Sandbox lifetime is diagnostic/runtime-scoped and cannot be permanent business memory |
| Use the Sites function filesystem | Deployment filesystem is not a durable shared repository |
| Let users point at a customer repo for the demo | Mixes infrastructure state with a consequential customer integration deferred to Phase 08 |
| One repository for all tenants | Increases blast radius and makes repository-level isolation and export harder to reason about |

## Rollback boundary

`IcmRepository` keeps provider calls out of product semantics. A failed remote
can be replaced by importing the last verified Git bundle without changing D1
authorization or EVE APIs. No rollback may rewrite accepted commits; recovery
creates a new verified remote and updates the opaque repository reference after
head reconciliation.
