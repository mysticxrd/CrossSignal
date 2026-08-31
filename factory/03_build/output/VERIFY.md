---
type: verification-record
stage: 03_build
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: passed
verified_at: 2026-08-31T12:42:35Z
---

# L14 Stage 03 verification

## Environment

| Property | Value |
|---|---|
| Platform | Windows / PowerShell |
| Node.js | `v22.15.0` |
| npm | `10.9.2` |
| tsx | `4.22.1` |
| Vite | `8.0.13` through `vinext build` |
| Truth mode | Executable local `FIXTURE` proof |

The user-level `npm` shim resolved to a missing AppData installation. Required
npm scripts were therefore invoked through the installed system npm executable
at `C:\Program Files\nodejs\npm.cmd`. The first sandboxed build attempt was
also denied permission to Vite's linked `node_modules/.vite-temp`; the same
unchanged build command passed after scoped permission was granted. Neither
environment issue required a product or dependency change.

## Command results

| Command | Exit | Relevant result |
|---|---:|---|
| `tsx --test tests/flight-recorder-build.test.mjs` | `0` | 57 passed, 0 failed; L14 pending/completed, auth/input/tenant/integrity/dependency, route, real-projector corruption, and count-invariance cases passed. |
| `tsx factory/03_build/verify.mjs` | `0` | Accepted inputs, baseline/product bindings, fixture digest, five real projector rejections, source invariants, acceptance coverage, and gate bindings passed. |
| `npm run lint` | `0` | ESLint completed with no findings. |
| `npm run build` | `0` | Vinext built client-reference, server-reference, RSC, client, and SSR environments; dynamic L14 API route emitted. |
| `npm run start -- --host 127.0.0.1 --port 4174` | ready, then stopped | Corrected local production server started; the exact two probes completed before the scoped server process was terminated. |
| `curl.exe -sS -i http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a` | `0` transport / HTTP `401` | Exact JSON authentication envelope, JSON content type, and `private, no-store`; no raw loader error. |
| `curl.exe -sS -i -H oai-authenticated-user-id:... -H oai-authenticated-user-email:... http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a` | `0` transport / HTTP `500` | Missing local D1 remained behind exact masked JSON dependency envelope and `private, no-store`. |
| `git diff --check` | `0` | No whitespace errors. |

## Positive results

- Strict identity, tenant membership, exact trace/event predicates, awaited
  parameters, stable schema, private no-store caching, ordered projection, and
  read-only count invariance all passed.
- The real resolver returned both the 28-event pending trace and 49-event
  completed trace through the real handler.
- The production route no longer eagerly evaluates the Cloudflare D1 adapter;
  unauthenticated HTTP reaches strict authentication and returns exact `401`.
- Every success event used the existing L04 redacted shape and contiguous
  sequence; no raw row fields or known secret-bearing fixture values appeared.

## Negative results

- `401` authentication failure and `400` input/query failures performed no
  durable lookup.
- Unauthorized, cross-tenant, and absent resources returned byte-identical
  non-disclosing `404` bodies despite spoofed request metadata.
- A persisted empty history returned real resolver `409`; each of the five
  accepted corruption histories was rejected by the real projector and mapped
  to event-free `409` output.
- Unknown-event details stayed empty, and dependency detail was masked behind
  the exact stable `500` envelope.
- An authenticated local production request without D1 also returned that
  stable masked `500`, rather than crashing the route import graph.
- Repeated positive and negative reads did not change tracked durable counts.

## Verification binding

| Input | SHA-256 |
|---|---|
| `factory/03_build/verify.mjs` | `e9e74b541c3d9e8aa8b4b3be5b4c7c380a34c5c5b6cd3f41ee67c5e92c7116b3` |

## Result

`passed`

Stage 03 is ready for human review. Verification opens this gate but does not
accept it; Stage 04 remains blocked until the reviewer records `accepted`.
