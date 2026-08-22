---
id: p00-m4-acceptance-evidence
status: complete
last_updated: 2026-08-11
---

# P00-M4 acceptance evidence

## Artifact proof

| Contract item | Evidence |
|---|---|
| Exact framework pin and lock | `../../../eve-spike/package.json`, `../../../eve-spike/package-lock.json` — `eve` is exactly `0.32.0` |
| Version-matched docs review | `BUNDLED_DOC_INDEX.md` |
| Minimal fixture agent | `../../../eve-spike/agent/agent.ts`; compiled summary had no discovery warnings |
| No product capabilities | `../../../eve-spike/agent/tools/`, compiled zero-capability summary, `SECURITY_BOUNDARY_REVIEW.md` |
| Intended server adapter | `../../../eve-spike/src/crosssignal-eve-adapter.ts` |
| Restart recovery | `EVE_RESTART_PROOF.json` and executable verifier `../../../eve-spike/scripts/verify-spike.ts` |
| Final topology decision | `../P00_M3/ADR-003_EVE_SERVICE_BOUNDARY.md` |

## Executed proof — 2026-08-11

| Check | Result |
|---|---|
| Exact dependency install | Pass; isolated lockfile pins EVE `0.32.0`, AI SDK `7.0.58`, JOSE `6.2.3`, and Zod `4.4.3` |
| Dependency audit | Pass; nested spike audit reported 0 vulnerabilities |
| `eve build` under Node `24.14.0` | Pass; Nitro `.output/` produced, 0 discovery errors and 0 warnings |
| Unauthenticated EVE info request | Rejected |
| First authenticated adapter turn | Waiting; real session `wrun_01KZRDVNFM8KDPTMYWBVWQEWA5` |
| Process replacement | PID `27092` replaced by PID `12244` |
| Durable retrieval | Same session; 9 stored events read after restart |
| Second authenticated adapter turn | Waiting; same session ID and deterministic turn 2 reply |
| Automated verifier | Pass, exit 0 |
| Spike TypeScript check | Pass, exit 0 under Node 24.14.0 |
| Root production build and contract suite | Pass; 11 tests, 11 passed, 0 failed, 0 skipped |
| Targeted application/database/test lint | Pass, exit 0 |

## Acceptance

- [x] The lockfile and docs index identify one exact EVE version and its bundled
  documentation source.
- [x] A real EVE-owned persistent identifier is retrieved after process restart.
- [x] The same session accepts a second turn after restart.
- [x] EVE execution state remains separate from absent fixture ICM semantic
  state and absent D1 operational authorization.
- [x] The browser receives no EVE credential, continuation token, or direct
  runtime route.
- [x] ADR-003 now accepts the separate Node service for later product work while
  truthfully deferring production Workflow-world selection and EVE deployment.
