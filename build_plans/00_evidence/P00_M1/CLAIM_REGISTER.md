---
id: p00-m1-visible-claim-register-v1
scope: current-owner-ui
status: frozen_candidate
taxonomy: [real, fixture, sandbox, simulated-time, planned]
---

# Visible claim and truthfulness register

## Taxonomy

- **Real** — implemented behavior backed by current platform/runtime state.
- **Fixture** — versioned synthetic business/provider data or a deterministic
  demo-only projection, even when the row that contains it is durably stored.
- **Sandbox** — a real external effect against an explicitly non-customer demo
  target. The current Phase 00 product has no sandbox effect yet.
- **Simulated time** — a disclosed manual clock advance over fixture windows.
- **Planned** — presentation or target behavior without current implementation
  evidence.

When a surface mixes mechanism and data, rows are split so each visible claim
has one classification. The “truth source” column states what an evaluator can
inspect today.

## Global, identity, and workspace claims

| ID | Visible claim or surface | Class | Truth source / required wording |
|---|---|---|---|
| CL-001 | Signed-in owner identity and sign-out | Real | Sites identity headers through `app/chatgpt-auth.ts` |
| CL-002 | Owner can create and switch workspaces | Real | D1 writes plus server action membership check |
| CL-003 | Active workspace survives refresh | Real | HTTP-only workspace cookie, validated against the owner's list |
| CL-004 | Workspace evidence, approvals, and case data persist | Real | D1 tables and server reads |
| CL-005 | Every cross-tenant read/write is isolated | Planned | Current checks exist; full two-user/two-workspace proof is P00-M2 |
| CL-006 | “Result demo · fixtures” global environment label | Fixture | Must remain visible across all product views |
| CL-007 | “System healthy / last scan” sidebar status | Planned | Replace with demo-shell readiness and fixture-cycle wording |

## Overview and scan claims

| ID | Visible claim or surface | Class | Truth source / required wording |
|---|---|---|---|
| CL-010 | Atlas Foundry business identity and paid-conversion metric | Fixture | `GOLDEN_FIXTURE.md` |
| CL-011 | 4.8%, −22.4%, 184 sessions, charts, and fixed windows | Fixture | Seeded D1 observations; dates are fixed, never wall clock |
| CL-012 | “Fresh 6m ago” and per-source minute ages | Fixture | Replace live freshness language with fixture snapshot/capture labels |
| CL-013 | Signal matched, 68% confidence, 92/100 relevance | Fixture | Seeded narrative; no detector/model calculation exists yet |
| CL-014 | Four sources align / source coverage | Fixture | Five seeded observations across four provider-like fixture classes |
| CL-015 | Four sources are connected or healthy | Fixture | Replace with “fixture snapshots loaded/ready” |
| CL-016 | Manual scan evaluates five rules | Planned | Current control is a client timer followed by a D1 cycle reset |
| CL-017 | Manual reset saves a new case cycle | Real | `transitionSeededCase(reset_case)` increments D1 cycle and appends an event |
| CL-018 | Scan cost, turn budget, or bounded agent work | Planned | No EVE runtime or cost accounting is connected in Phase 00 |
| CL-019 | Next dispatcher at 02:00 UTC / outcome schedule | Planned | Production schedules are Phase 08; remove clock claim |

## Case, evidence, and runtime claims

| ID | Visible claim or surface | Class | Truth source / required wording |
|---|---|---|---|
| CL-020 | Case stage, cycle, event count, and last event | Real | D1 `cases` and `case_events` |
| CL-021 | Evidence values, source queries, windows, and identities | Fixture | Versioned synthetic rows seeded in D1 |
| CL-022 | Evidence content hash | Real | SHA-256 computed before the fixture row is stored |
| CL-023 | Evidence rows are immutable | Real | SQLite trigger rejects update |
| CL-024 | Attributed evidence corrections exist | Planned | Relabel as future; no annotation model exists |
| CL-025 | Leading and alternative hypotheses, falsification test | Fixture | Static golden-case content; not EVE-produced yet |
| CL-026 | Independent skeptic pass and Agent Run `AR-2281` | Planned | No EVE dependency/run exists; label as skeptic fixture with no run |
| CL-027 | `investigation/evidence-brief.md` exists | Planned | No ICM repository/artifact exists in Phase 00 |
| CL-028 | Human review note and approval survive refresh | Real | Approval hash/event are D1-backed; textarea draft itself is not persisted |
| CL-029 | Complete artifact editing/diff history | Planned | Phase 01 and Phase 03 |
| CL-030 | Permanent additive workspace ledger | Real | D1 events persist across case cycles; retention proof is later work |

## Action, measurement, learning, and Lab claims

| ID | Visible claim or surface | Class | Truth source / required wording |
|---|---|---|---|
| CL-040 | Approval records a payload hash | Real | D1 `approvals.payload_hash` generated server-side |
| CL-041 | Displayed pre-approval hash `a93f…70c2` is current | Planned | Remove static hash; say the hash is calculated on save |
| CL-042 | Exactly one GitHub issue was externally created | Fixture | Current code generates a receipt-like string; no provider call occurs |
| CL-043 | Current action is a sandbox GitHub write | Planned | No sandbox adapter exists until Phase 04 |
| CL-044 | Current receipt proves external idempotency | Fixture | D1 transition is idempotent by stage/event key; it is not a provider receipt |
| CL-045 | Deployment and implementation facts | Fixture | Frozen golden-case values plus a real D1 implementation event |
| CL-046 | Measurement is scheduled and collecting exposure | Planned | No scheduler or source ingestion exists |
| CL-047 | 14-day time jump | Simulated time | Explicit owner control over fixed fixture dates |
| CL-048 | Improved +18.7%, 5.7%, 73 sessions | Fixture | Predetermined golden outcome stored as a D1 event, not calculated yet |
| CL-049 | Company Brain Markdown diff is canonical or merged | Planned | No Git-backed ICM repository exists in Phase 00 |
| CL-050 | Learning acceptance closes the D1 case | Real | Server transition persists approval/event/stage |
| CL-051 | Company profile, metric definition, and learning copy | Fixture | Static golden workspace presentation |
| CL-052 | Brain export is prepared | Planned | Current button only shows a client notification |
| CL-053 | Sanitization checks have run | Planned | Static checklist; sanitization pipeline is Phase 05/07 |
| CL-054 | Public Lab publish/unpublish changes hosted state | Planned | Current toggle is client-only; label it local preview only |
| CL-055 | Eval suite `18 / 18 passing` | Planned | No stored eval executions exist; replace with “not run” |

## Connections and policy claims

| ID | Visible claim or surface | Class | Truth source / required wording |
|---|---|---|---|
| CL-060 | PostHog, Stripe, GitHub, and support connection cards | Fixture | Provider-like fixture manifest only; no OAuth/connection records |
| CL-061 | Revalidate all sources | Planned | No provider revalidation exists; replace with fixture-manifest review |
| CL-062 | Repository allow-list and 15-minute approval expiry are enforced | Planned | Current D1 schema lacks policy version, target binding, expiry, and consume state |
| CL-063 | “Locked by server policy” | Planned | Replace with “Phase 04 sandbox policy” until enforced |
| CL-064 | Customer provider credentials are isolated | Planned | No provider credentials exist; phrase only as a future invariant |

## Release rule

No row classified **planned** may use present-tense success language. Fixture
and simulated-time rows must carry a local disclosure, not rely solely on the
global badge. A **sandbox** classification may be introduced only after a real
non-customer provider receipt exists. Any new visible claim must be added here
in the same increment that adds the claim.
