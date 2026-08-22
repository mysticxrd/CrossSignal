---
id: p00-m4-evidence
phase: phase-00
milestone: P00-M4
status: complete
---

# P00-M4 — Prove the EVE hosting topology

## Contract

Prove a minimal EVE runtime without product capabilities, keep it outside the
Cloudflare/Sites application, call it only through a server-side CrossSignal
adapter, and recover the same durable session after replacing the EVE process.

## Boundaries

- **ICM semantic state:** absent from the spike; `icm_head` is only a signed
  fixture claim. The spike does not create or modify canonical artifacts.
- **EVE execution state:** the real EVE local Workflow world owns the fixture
  session, event stream, cursor, and turn checkpoints.
- **D1 operational authorization:** absent from the spike. A future Sites
  server action must authorize membership and write the D1 run mapping before
  minting the execution envelope. EVE cannot replace that decision.

## Outputs

- Exact isolated package and lockfile under `../../../eve-spike/`.
- `BUNDLED_DOC_INDEX.md` for the version-matched documentation review.
- Updated `../P00_M3/ADR-003_EVE_SERVICE_BOUNDARY.md`.
- `EVE_RESTART_PROOF.json` from the clean automated proof.
- `SECURITY_BOUNDARY_REVIEW.md` and `ACCEPTANCE_EVIDENCE.md`.

The runtime, model, identifiers, and replies in this evidence are classified as
**fixture**. The durability behavior and EVE-generated session/event state are
real.
