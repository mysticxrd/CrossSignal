---
id: ADR-004
title: Expiring runtime traces and permanent application ledger
status: accepted
date: 2026-08-11
---

# ADR-004 — Trace and ledger retention

## Decision

EVE Agent Runs and provider telemetry are diagnostic and may expire. The D1
application ledger is the permanent business audit surface for the demo. No
business transition, approval, artifact version, action intent/result,
measurement, or learning acceptance exists only in a trace.

## Retention split

| Record | Store | Demo policy | Content rule |
|---|---|---|---|
| ICM semantic artifacts/history | Private Git | Retained for workspace lifetime | Redacted decision content only |
| Business ledger | D1 | Permanent for the demo; production retention requires later policy | Stable IDs, actors, hashes, decisions, receipts, timestamps |
| EVE Agent Run content | EVE/provider trace | Target 14 days or provider limit, whichever is shorter | Redacted; no credentials/direct identifiers/raw support text |
| Content-free runtime/security summary | D1 | 365-day target from PRD; production enforcement deferred | Version, latency, token/cost, error class, trace/run IDs |
| Restricted raw evidence | Not collected in result demo | Production store/expiry deferred | Fixtures only in demo |

## Expiry behavior

When an Agent Run expires, the case still shows the permanent ledger, EVE/run
IDs, versions, bounded summary, final artifact hashes, and whether the trace is
available. The UI never relabels an expired trace as missing business evidence.
A retry creates a related run row; it never rewrites the prior ledger entry.

## Redaction and credentials

Redaction happens before telemetry emission. Secret values, continuation
handles, signed context envelopes, raw customer content, and Git/provider
credentials are excluded from logs and traces. Approval never bypasses this
rule.

## Rejected alternatives

- Keep full traces forever — rejected for privacy, cost, and provider-retention
  dependence.
- Use trace retention as the business ledger — rejected because expiry would
  destroy the decision record.
- Copy hidden reasoning into D1 — rejected because it is neither required for
  business observability nor appropriate for permanent retention.
