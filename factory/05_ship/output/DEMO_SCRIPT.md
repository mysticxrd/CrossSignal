---
type: demo-script
stage: 05_ship
unit: supabase-postgres-authenticated-trace-resolution-parity
truth_mode: TEST
---

# Cold reviewer path: Supabase trace-resolution TEST proof

## Prerequisites

- Git checkout containing product commit
  `a6bd74eba5ab3a709ae959690932521c856e76e1` and this Stage 05 package.
- Node.js `>=22.13.0`.
- No Supabase password, service-role key, or persistent database login is
  required for the captured evidence path.

Install the exact locked dependencies from the repository root:

```powershell
npm ci
```

## Cold verification

Run the accepted build and release checks from their final closed-gate state:

```powershell
npm run verify:build
npm run verify:release
npm run verify:ship
npm run build
```

Expected results:

- the route and adapter suite reports 63 passing tests and zero failures;
- Stage 03, Stage 04, and Stage 05 verifiers pass;
- the production build emits `/` and
  `/api/workspaces/:workspaceId/traces/:traceId`;
- no database credential is requested.

## Five-minute evidence walkthrough

1. Start with `factory/05_ship/output/RELEASE_MANIFEST.md`. State that the
   proof is TEST and bound to the named product commit.
2. Open `factory/04_verify/output/VERIFICATION_REPORT.md`. Show the hosted
   `2 / 2 / 2 / 77` data counts and the actual adapter result: 28 pending events,
   49 completed events, and cross-tenant `not_found`.
3. Show the RLS evidence: each owner sees zero foreign traces/events, missing
   tenant context sees zero, and `cfr_trace_reader` has no write grants.
4. Show the current advisor result: zero security findings and five `Unused
   Index` INFO notices on the small TEST dataset.
5. Close on the limits: the Supabase migration ledger is empty, the adapter is
   not deployed, no persistent runtime credential exists, and D1 remains the
   rollback path.

## Optional owner-authorized refresh

A reviewer with access to the project-scoped Supabase connector may repeat the
read-only count, tenant-isolation, privilege, and advisor queries. The captured
release does not depend on such access and must never ask the reviewer to paste
a database password into a command or document.

## Claim discipline

Say “hosted Supabase PostgreSQL TEST parity for the authenticated trace read.”
Do not claim complete D1 replacement, production readiness, automated migration
delivery, causal outcomes, or exactly-once behavior.
