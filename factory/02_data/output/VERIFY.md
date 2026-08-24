---
type: verification-record
stage: 02_data
status: passed
verified_at: 2026-08-23T19:16:24.7476295Z
verifier_sha256: dfb9d345d6b69418eee5f37e90068564773cbc1952b424530e8f56f7b4ff366a
---

# Stage 02 verification

## Result

The L06 data package is executable and review-ready. It binds the accepted
Stage 01 contract, uses repository canonical hashing and artifact validation,
and passes the complete deterministic reference-model suite.

## Environment

| Field | Value |
|---|---|
| Branch | `codex/l06-graph-executor` |
| Sealed base commit | `464df6be405307f4412894e0d24d1569bf3036b6` |
| Node.js | `v22.15.0` |
| TypeScript runner | project-local `tsx` 4.22.1 |
| Platform | Windows / PowerShell |
| Verification time | `2026-08-23T19:16:24.7476295Z` |

## Commands

| Command | Exit | Result |
|---|---:|---|
| `node_modules/.bin/tsx.cmd factory/02_data/verify.mjs` | 0 | Passed: 6 fixed nodes, 8 schedules, 5 resume boundaries, 14 database-attack contracts, 10 stable errors, and FIXTURE truth. |
| `node --test factory/_lib/factory-tools.test.mjs` | 0 | Passed 3/3 factory hashing, freshness, and seal regressions. |
| `git diff --check` | 0 | No whitespace errors. |

## Executed schedule evidence

- Cold execution produced six succeeded attempts and six runtime-produced
  FIXTURE artifacts, one synthesizer-bound intent, one policy, and zero grants,
  effects, or outcomes.
- Stops after boundaries one through five resumed to identical completed hashes
  with every handler invoked exactly once.
- A claimed worker rejected a competitor, retained expired attempt 1 as
  `l06_interrupted_attempt`, and completed attempt 2 without duplicate artifact.
- Competing planner ownership rejected a wrong token; the owner finalized once;
  same-token duplicate finalization was idempotent.
- Skeptic failure preserved four upstream artifacts, omitted synthesizer, failed
  the trace, and left all authority/effect relations empty.
- Predecessor-hash drift blocked claim before quantitative handler invocation.
- Foreign workspace and caller-authored graph fields failed before mutation.
- Undeclared citations and a token-shaped secret both failed artifact
  validation with zero artifact or authority rows.

## Initial failure and correction

The first verifier run intentionally exercised both invalid-artifact mutations
and failed because the synthetic secret string did not match the repository's
actual secret patterns. The fixture was corrected to use a token-shaped value
recognized by `validateReasoningArtifact`; the fixture binding was re-hashed,
and the complete verifier then passed. No product contract was weakened.

## Verified data decisions

- The fixed topology is code-owned and request fields cannot define nodes,
  edges, handlers, graph versions, or truth mode.
- Attempts are materialized only when predecessor output hashes exist, avoiding
  placeholder or later-rewritten input hashes.
- Legacy rows must be backfilled as `precomputed_fixture`, not runtime evidence.
- Runtime attempts require graph/handler versions, predecessor outputs, claim
  ownership/expiry, immutable terminal history, and partial uniqueness.
- The executable fixture remains an in-memory FIXTURE oracle; it is not product
  runtime proof and cannot be imported by production code.
- L08 regression is delegated unchanged to Stage 03; L20, L04, and L14 remain
  open.

## Artifact hashes

| Artifact | SHA-256 |
|---|---|
| `factory/02_data/output/DATA_PACKAGE.md` | `9fbda72f20659df210d95a6be5b1a13dbe4fde288461d5f435fcfdc8164bbaa6` |
| `factory/02_data/fixtures/persisted-graph-executor.fixture.mjs` | `fb2d985e76b6f05bfdda04cfa42b6effbf1dd75d96e1756947e7f555463f9051` |
| `factory/02_data/verify.mjs` | `dfb9d345d6b69418eee5f37e90068564773cbc1952b424530e8f56f7b4ff366a` |

## Stage boundary

No application, database, migration, worker, or product-test file was changed
by Stage 02. Database attacks are accepted executable contracts here; Stage 03
must implement and run them against durable database state before claiming the
runtime correction works.
