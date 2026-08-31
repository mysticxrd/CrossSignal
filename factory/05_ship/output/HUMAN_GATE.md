---
type: human-gate
stage: 05_ship
gate_status: closed
decision: accepted
reviewer: human
reviewed_at: 2026-08-31T18:07:18Z
release_manifest_sha256: 266b76349fd6cebb131cad5bf221aab27c77eab29f6a8f2c3bc3825212212bfe
demo_script_sha256: 3f52ccb4f78243a9fb8e92d9182fb672eb8c2735c0b17c98dcc383cc4825f01a
verification_sha256: d9e5cd89a008a68a861347bb3e26df04be782d101c8092f2d3520710c8c69893
---

# Stage 05 human gate

The complete L14 release head, cold evaluator runbook, and ship verification
are fresh. Human review is required before commit and seal.

## Review checklist

- [x] Run `npm run demo:prepare` from the reviewed checkout without editing files.
- [x] Confirm all 115 release-head files match the manifest.
- [x] Confirm the focused suite passes 57 tests, including 28 pending and 49 completed events.
- [x] Confirm lint and the Vinext production build pass.
- [x] Confirm the manifest binds accepted Stage 04 evidence and all 14 acceptance plus 12 negative IDs.
- [x] Confirm the cold runbook proves exact no-store HTTP `401`, `400`, and masked no-D1 `500` boundaries.
- [x] Confirm durable successful resolution is explicitly labeled local `FIXTURE` evidence.
- [x] Confirm no deployed endpoint, live D1, external integration, UI, exactly-once, or causal claim is made.
- [x] Confirm the cold path contains no hidden repair, fixture regeneration, migration generation, or stash application.
- [x] Confirm all three benchmark stashes remain preserved.
- [x] Choose whether to authorize the complete L14 release commit and seal check.

## Reviewed artifacts

| Artifact | SHA-256 |
|---|---|
| `factory/05_ship/output/RELEASE_MANIFEST.md` | `266b76349fd6cebb131cad5bf221aab27c77eab29f6a8f2c3bc3825212212bfe` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `3f52ccb4f78243a9fb8e92d9182fb672eb8c2735c0b17c98dcc383cc4825f01a` |
| `factory/05_ship/output/VERIFY.md` | `d9e5cd89a008a68a861347bb3e26df04be782d101c8092f2d3520710c8c69893` |

## Decision

`accepted`

The human accepted the reviewed artifacts against the hashes above and
authorized the complete L14 release commit and seal check.
