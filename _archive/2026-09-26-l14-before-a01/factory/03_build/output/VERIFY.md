---
type: verification-record
stage: 03_build
unit: supabase-postgres-authenticated-trace-resolution-parity
status: passed
truth_mode: TEST
verified_at: 2026-09-08T23:24:42+05:30
---

# Supabase Stage 03 verification

## Result

The local implementation, production build, hosted PostgreSQL controls, actual
transaction-pooler adapter, and post-migration advisor state passed the Stage
03 TEST contract. Exit code: `0`.

## Local implementation checks

Command:

```powershell
node node_modules/tsx/dist/cli.mjs --test tests/flight-recorder-build.test.mjs tests/supabase-trace-resolution.test.mjs
```

Exit code: `0`. The focused suite reported 63 tests passed, 0 failed. It covers
the existing route contract plus provider selection, pooler validation,
transaction-local tenant context, explicit tenant predicates, canonical value
mapping, missing rows, cross-tenant results, and error behavior.

Command:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
```

Exit code: `0`. ESLint reported no findings.

Command:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
```

Exit code: `0`. Vinext completed all five environments and produced the page
route plus the dynamic trace API route. The build emitted informational plugin
timing and Node experimental-glob notices but no build failure.

## Hosted migration and fixture

Target: Supabase project `tonuxepirauyqcwbwenw`, Free Plan, Mumbai
`ap-south-1`, TEST data only.

The initial migration, trace-subject correction, and RLS/index optimization
migrations executed successfully in lexical order. The first fixture attempt
failed atomically with `23514` and committed no rows; after the bound-subject
correction, the deterministic load returned counts `2 / 2 / 2 / 77` for
workspaces, workspace members, traces, and events.

The repository SQL test ran through `SET LOCAL ROLE cfr_trace_reader` and
completed successfully. It observed 28 events for tenant A, 49 events for
tenant B, zero cross-tenant rows, zero rows without local tenant settings, and
the expected denials for reader writes and invalid event mutations. Its three
test transactions rolled back.

## Actual adapter check

A short-lived, least-privilege database login called the repository adapter via
the transaction pooler. Its redacted result was:

```json
{"provider":"supabase","pooler":"transaction","pendingEvents":28,"completedEvents":49,"crossTenant":"not_found"}
```

The login was revoked and dropped, the temporary local files were deleted, and
a hosted query confirmed `probe_removed: true`.

## Advisor check

After refreshing Supabase Advisor Center, the earlier four Auth RLS
Initialization Plan warnings and two unindexed foreign-key notices were absent.
The remaining findings were six `Unused Index` INFO notices on the fresh TEST
dataset. No security or performance warning remained.

## Repository integrity

Command:

```powershell
git diff --check
```

Exit code: `0`. Git reported line-ending notices only and no whitespace error.

Command:

```powershell
node node_modules/tsx/dist/cli.mjs factory/03_build/verify.mjs
```

Exit code: `0`. Output: `Stage 03 build verification passed.` The verifier
confirmed accepted Stage 02 authority, all declared input and artifact hashes,
runtime safety constraints, migration and SQL-test controls, hosted result
tokens, and the open Stage 03 human-gate bindings.
