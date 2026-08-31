---
type: evaluator-runbook
stage: 05_ship
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: ready
truth_mode: FIXTURE
---

# L14 cold evaluator script

## Promise

This runbook demonstrates one read-only endpoint:

```text
GET /api/workspaces/{workspaceId}/traces/{traceId}
```

It proves strict authentication and stable local HTTP boundaries, then uses a
migrated in-memory database with labeled `FIXTURE` histories to prove tenant
scope, complete L04 projection, ordering, redaction, integrity, secrecy, and
read-only behavior. It is not a deployed endpoint or live D1 demonstration.

## Preconditions

- Start at the reviewed repository checkout with dependencies already present.
- Use Windows PowerShell, Node `v22.15.0` or another supported Node `>=22.13.0`,
  and no environment secret values.
- Do not edit files, regenerate fixtures, generate migrations, or apply stashes.

## 1. Confirm governed state

```powershell
& 'C:\Program Files\nodejs\node.exe' factory/status.mjs
```

Expected before human acceptance: Stages 01-04 are complete and accepted,
Stage 05 is active at its human gate, and the release is not yet sealed.

## 2. Validate the cold release package

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run demo:prepare
```

Expected: the helper reports that every release-head file matches the manifest
and that the evaluator path requires no hidden repair.

## 3. Execute the durable FIXTURE story

```powershell
& '.\node_modules\.bin\tsx.cmd' --test tests/flight-recorder-build.test.mjs
```

Expected: `57` tests pass. The L14 cases execute a 28-event pending trace and a
49-event completed trace through the real handler, tenant-bound resolver,
migrated in-memory database, and L04 projector. They also exercise identical
non-disclosing `404` responses, five corruptions, stable errors, secret
suppression, and repeated-read invariance.

## 4. Check source and production compilation

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run lint
& 'C:\Program Files\nodejs\npm.cmd' run build
```

Expected: lint passes and Vinext emits the dynamic route
`/api/workspaces/:workspaceId/traces/:traceId`.

## 5. Probe the local production HTTP boundary

Start the server:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run start -- --host 127.0.0.1 --port 4174
```

From a second PowerShell terminal, prove authentication-first route loading:

```powershell
curl.exe -sS -i "http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a"
```

Expected: HTTP `401`, `Cache-Control: private, no-store`, JSON content type, and
`{"error":{"code":"authentication_required"}}`.

Prove authenticated query rejection before lookup:

```powershell
curl.exe -sS -i -H "oai-authenticated-user-id: l14-owner-a" -H "oai-authenticated-user-email: owner-a@example.test" -H "oai-authenticated-user-full-name: Owner%20A" -H "oai-authenticated-user-full-name-encoding: percent-encoded-utf-8" "http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a?fields=payloadJson"
```

Expected: HTTP `400`, the same no-store and JSON headers, and
`{"error":{"code":"invalid_trace_request"}}`.

Prove dependency failure masking without a local D1 binding:

```powershell
curl.exe -sS -i -H "oai-authenticated-user-id: l14-owner-a" -H "oai-authenticated-user-email: owner-a@example.test" -H "oai-authenticated-user-full-name: Owner%20A" -H "oai-authenticated-user-full-name-encoding: percent-encoded-utf-8" "http://127.0.0.1:4174/api/workspaces/l14-workspace-a/traces/l14-trace-a"
```

Expected: HTTP `500`, the same no-store and JSON headers, and
`{"error":{"code":"trace_resolution_unavailable"}}`. This is an expected
masked local dependency result, not a successful D1 lookup. Stop the server
with `Ctrl+C` after the probes.

## 6. Inspect the release evidence

Review:

- `factory/04_verify/output/VERIFICATION_REPORT.md`
- `factory/05_ship/output/RELEASE_MANIFEST.md`
- `factory/05_ship/output/VERIFY.md`
- `factory/05_ship/output/HUMAN_GATE.md`

Confirm the release remains labeled `FIXTURE`, all 14 acceptance IDs and 12
negative IDs are resolved, and no deployed, live D1, external integration, or
UI claim is made.

## Stop rule

No repair, fixture regeneration, migration generation, or file edit is part of
this cold run. If any expected result differs, stop and report the first broken
boundary; do not patch the release while demonstrating it. Commit and seal are
separate actions after human acceptance of Stage 05.
