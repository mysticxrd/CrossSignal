---
type: verification-record
stage: 04_verify
status: passed
verified_at: 2026-08-31T13:18:07Z
environment: local-windows-node
truth_mode: FIXTURE
---

# L14 Stage 04 verification record

## Environment

- OS: `Microsoft Windows 10.0.26200`
- Node: `v22.15.0`
- Runtime evidence: local Vinext production server on `127.0.0.1:4174`
- Data evidence: migrated in-memory SQLite with explicitly labeled `FIXTURE` histories
- Browser/UI evidence: not applicable; L14 exposes an HTTP API without a UI entry point
- Secret values read: none

## Artifact bindings

| Input | SHA-256 |
|---|---|
| `factory/04_verify/verify.mjs` | `49358bdfd13d7c102ecd7cd8f1a0467f839aefde04dfee9d1ac9dc3ef3641b5d` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `1db772fa55840bdb8d5dab2daa26da1ca8e21ea1d91d0153b19415b34b950400` |

## Commands

| Timestamp UTC | Command | Exit | Relevant result |
|---|---|---:|---|
| `2026-08-31T13:08:00Z` | `& '.\\node_modules\\.bin\\tsx.cmd' --test tests/flight-recorder-build.test.mjs` | `0` | Ended `13:08:05Z`; `57` passed, `0` failed; both L14 success traces and all fail-closed cases passed. |
| `2026-08-31T13:08:00Z` | `& 'C:\\Program Files\\nodejs\\npm.cmd' run lint` | `0` | Ended `13:08:07Z`; ESLint completed without findings. |
| `2026-08-31T13:08:26Z` | `& 'C:\\Program Files\\nodejs\\npm.cmd' run build` | `0` | Ended `13:08:39Z`; five Vinext environments built and the dynamic L14 route was emitted. |
| `2026-08-31T13:05:01Z` | `& 'C:\\Program Files\\nodejs\\npm.cmd' run start -- --host 127.0.0.1 --port 4174` | `n/a` | Long-running server announced readiness; it was stopped after probes and port `4174` had no remaining listener. |
| `2026-08-31T13:05:01Z` | `curl.exe -sS -i "http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a"` | `0` | HTTP `401`; exact JSON authentication error, JSON content type, and `private, no-store`. |
| `2026-08-31T13:05:03Z` | `curl.exe -sS -i -H "oai-authenticated-user-id: l14-owner-a" [...] "http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a?fields=payloadJson"` | `0` | HTTP `400`; exact JSON invalid-request error and `private, no-store`. |
| `2026-08-31T13:05:02Z` | `curl.exe -sS -i -H "oai-authenticated-user-id: l14-owner-a" [...] "http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a"` | `0` | HTTP `500`; exact masked JSON unavailable error and `private, no-store`; no raw loader failure. |
| `2026-08-31T13:14:56Z` | `git diff --check` | `0` | No whitespace errors. |
| `2026-08-31T13:18:07Z` | `& '.\\node_modules\\.bin\\tsx.cmd' factory/04_verify/verify.mjs` | `0` | Accepted input hashes, source invariants, all 26 case outcomes, report bindings, and the open gate validated. |

## Evidence disposition

The local production boundary proves authentication-first route loading,
pre-lookup query rejection, stable cache headers, JSON error envelopes, and
masked dependency failure. The migrated in-memory `FIXTURE` boundary proves
the complete tenant-scoped resolver, L04 projection, two success histories,
isolation, integrity, secrecy, ordering, and read-only invariance.

The initial sandboxed build preflight could not write Vite's temporary config
file through the workspace dependency junction. The same governed build command
was rerun with workspace write access and passed as recorded above; no product
or factory input changed between those attempts.

## Disposition

`status: passed`. Stage 04 opens its human gate and stops. Stage 05 is not
authorized until that gate is accepted.
