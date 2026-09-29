---
type: verification-record
stage: 04_verify
unit: supabase-postgres-authenticated-trace-resolution-parity
status: passed
truth_mode: TEST
verified_at: 2026-09-08T23:42:42+05:30
---

# Supabase Stage 04 verification commands

## Focused route and adapter suite

```powershell
node node_modules/tsx/dist/cli.mjs --test tests/flight-recorder-build.test.mjs tests/supabase-trace-resolution.test.mjs
```

Exit code: `0`. Result: 63 tests passed, 0 failed. The suite covered the D1
rollback path, Supabase provider dispatch, transaction-pooler validation,
authenticated route behavior, tenant and integrity failures, canonical
mapping, no-fallback behavior, and deterministic secret-free fixture output.

## Lint

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
```

Exit code: `0`. ESLint reported no findings.

## Production build

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
```

Exit code: `0`. Vinext completed all five build environments and emitted the
page route plus `/api/workspaces/:workspaceId/traces/:traceId`. Node reported
only its experimental-glob notice.

## Supabase connector

The project-scoped Supabase connector executed read-only SQL for fixture counts,
probe-role absence, both tenant contexts, missing context, and reader grants.
It also read the security and performance advisors and migration ledger.

Exit code: `0`. Results:

- counts `2 / 2 / 2 / 77` and `probe_removed: true`;
- tenant A `28 / 0 / 0` and tenant B `49 / 0 / 0` for own events, foreign
  traces, and foreign events;
- `visible_without_context: 0`;
- SELECT granted on all four tables and no INSERT, UPDATE, or DELETE grant;
- zero security advisories;
- five `Unused Index` INFO notices and no performance warning; and
- an empty Supabase migration ledger, disclosed in the report.

All tenant queries ran in read-only transactions after `SET LOCAL ROLE
cfr_trace_reader` and rolled back.

## Repository diff inspection

```powershell
git diff --check
```

Exit code: `0`. Git emitted line-ending notices only and found no whitespace
error.

## Stage verifier

```powershell
node factory/04_verify/verify.mjs
```

Exit code: `0`. Output: `Stage 04 release verification passed.` The verifier
confirmed Stage 03 acceptance, all five declared input hashes, resolved result
tokens, secret-safe evidence, and the open human-gate bindings.
