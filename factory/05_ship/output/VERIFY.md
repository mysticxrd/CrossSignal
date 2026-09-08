---
type: verification-record
stage: 05_ship
unit: supabase-postgres-authenticated-trace-resolution-parity
status: passed
truth_mode: TEST
verified_at: 2026-09-08T23:54:43+05:30
---

# Supabase Stage 05 verification commands

## Accepted build verifier

```powershell
npm run verify:build
```

Exit code: `0`. The final closed-gate path reported 63 passing tests and
`Stage 03 build verification passed.`

## Accepted release verifier

```powershell
npm run verify:release
```

Exit code: `0`. Output: `Stage 04 release verification passed.`

## Cold-package preparation

```powershell
npm run demo:prepare
```

Exit code: `0`. The command resolved the accepted Stage 04 gate and printed the
bound product head plus the three reviewer entry points.

## Stage 05 verifier

```powershell
npm run verify:ship
```

Exit code: `0`. Output: `Stage 05 release verification passed.`

## Repository diff inspection

```powershell
git diff --check
```

Exit code: `0`. Git found no whitespace error.
