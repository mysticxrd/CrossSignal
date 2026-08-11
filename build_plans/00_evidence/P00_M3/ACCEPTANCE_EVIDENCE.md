---
id: p00-m3-acceptance-evidence
status: complete
verified_at: 2026-08-11
---

# P00-M3 acceptance evidence

| Milestone requirement | Evidence |
|---|---|
| App-managed private Git strategy behind `IcmRepository` | `ADR-001_ICM_REPOSITORY.md` |
| Semantic versus operational authority | `ADR-002_STATE_AND_AUTHORITY.md` |
| Review artifact separated from approval authorization | ADR-002 hash-binding and mismatch sections |
| Signed server-to-server workspace/case context | `ADR-003_EVE_SERVICE_BOUNDARY.md` |
| EVE session/run/cursor mapping | ADR-003 D1 run mapping |
| Expiring traces without ledger loss | `ADR-004_TRACE_AND_LEDGER_RETENTION.md` |
| One-page ownership diagram | `STATE_OWNERSHIP_DIAGRAM.md` |
| Rejected alternatives and rollback boundaries | ADRs 001–004 |

## Walk test

- [x] Every artifact, review, approval, run, receipt, metric, learning, and trace
      has one canonical owner.
- [x] Semantic and operational reconstruction are separate and explicit.
- [x] ICM/D1 hash disagreement fails closed; neither store overwrites the other.
- [x] The model cannot choose a tenant, repository, credential, policy, or
      idempotency key.
- [x] The browser receives no Git/provider credential or EVE continuation
      handle.
- [x] A failed EVE spike rolls back at the adapter without changing accepted D1
      or ICM state.

ADR-003's separate-service compatibility statement is deliberately subject to
the real exact-version P00-M4 spike. A contrary bundled runtime requirement
must revise the ADR explicitly; it may not be worked around silently.

## Verification proof

- `node --test tests\rendered-html.test.mjs`: 10 tests passed, 0 failed, with
  the state-owner/topology contract test included.
- `git diff --check`: no whitespace errors.
