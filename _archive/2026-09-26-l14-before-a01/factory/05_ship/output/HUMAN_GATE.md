---
type: human-gate
stage: 05_ship
unit: supabase-postgres-authenticated-trace-resolution-parity
gate_status: closed
decision: accepted
reviewer: human
reviewed_at: 2026-09-09T00:02:08+05:30
release_manifest_sha256: 697e52ff7aae064cfeb51df807029b2268138647a7f54de79ac2b9e8c0db7324
demo_script_sha256: c0166ba62e5771ea9cb0dedc1e25b0a3e021a739ae82976cc4468f9e6106a3bb
verification_sha256: bb69589871a52a9f031acd13b72ed7ade9611ba1023259871f219bc18dc9b4f1
---

# Supabase Stage 05 final human gate

This gate binds the evaluator-facing TEST release candidate to product commit
`a6bd74eba5ab3a709ae959690932521c856e76e1`.

## Cold-review checklist

- [x] Run `npm ci` in a clean checkout or confirm the locked dependency install.
- [x] Run `npm run verify:build`, `npm run verify:release`,
  `npm run verify:ship`, and `npm run build`.
- [x] Confirm the release is consistently labeled TEST.
- [x] Confirm hosted counts `2 / 2 / 2 / 77`, owner results `28 / 49`, zero
  cross-tenant visibility, and SELECT-only reader authority.
- [x] Confirm zero security advisories and five fresh-dataset `Unused Index`
  INFO notices are represented accurately.
- [x] Confirm the empty Supabase migration ledger is disclosed.
- [x] Confirm no deployed Supabase route or persistent credential is claimed.
- [x] Confirm D1 remains the rollback path and complete replacement is not
  claimed.
- [x] Confirm the product commit and cold reviewer path are sufficient for the
  portfolio proof.
- [x] Choose `accepted`, `changes-requested`, or `rejected`.

## Reviewed artifacts

| Artifact | SHA-256 |
|---|---|
| `factory/05_ship/output/RELEASE_MANIFEST.md` | `697e52ff7aae064cfeb51df807029b2268138647a7f54de79ac2b9e8c0db7324` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `c0166ba62e5771ea9cb0dedc1e25b0a3e021a739ae82976cc4468f9e6106a3bb` |
| `factory/05_ship/output/VERIFY.md` | `bb69589871a52a9f031acd13b72ed7ade9611ba1023259871f219bc18dc9b4f1` |

## Decision

`accepted`

The human accepted this evaluator-facing TEST release and its disclosed limits
in the Codex task on 2026-09-09T00:02:08+05:30. This acceptance authorizes the
repository release seal; it does not authorize deployment or persistent
database credentials.
