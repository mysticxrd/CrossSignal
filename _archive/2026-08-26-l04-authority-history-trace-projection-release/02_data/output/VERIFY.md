---
type: stage-verification
stage: 02_data
status: passed
verified_at: 2026-08-25T14:28:58.0677189+05:30
command: node factory/02_data/verify.mjs
exit_code: 0
---

# Stage 02 verification

The accepted L04 specification is resolved into an executable data package and
deterministic FIXTURE. All declared inputs are fresh, the fixture validates its
authority and subject histories, the projection is complete and redacted, all
accepted and negative IDs are covered, and no durable product path changed.

## Environment

| Property | Value |
|---|---|
| Platform | `win32` |
| Architecture | `x64` |
| Node | `v22.15.0` |
| Working directory | repository root |

## Command result

```text
$ node factory/02_data/verify.mjs
Stage 02 data verification passed.
Declared inputs: 21
Fixture: l04-authority-trace-v1
Control events: 3
Trace events/projected events: 34/34
Race schedules: 3
Migration cases: 6
Acceptance/negative coverage: 12/12
Durable product changes: none
Human gate: open / pending
```

Exit code: `0`.

## Verified artifact hashes

| Artifact | Normalized SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `5db9abd329345ef96b5c6bb0ea3714d693610c6e3263386b4875b6f4de03ffe3` |
| `factory/02_data/verify.mjs` | `f7e897e1a8ec5808189528a201824e6dbc25472bcc917070ca0b671a921b9ec7` |
| `factory/02_data/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |
| `factory/02_data/output/DATA_PACKAGE.md` | `a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d` |
| `factory/02_data/output/HUMAN_GATE.md` (open) | `82f277c3cf8f04b14ddf9bb7e851240de35643c744a1c5ac096faacf9914ee31` |

The complete 21-input hash set is recorded in `DATA_PACKAGE.md` and recomputed
by the verifier.

## Fixture assertions

- Three canonical control events form off/on/off history with valid hashes,
  gap-free workspace sequence, matching prior states, and no no-op event.
- Thirty-four subject-bound trace events form valid trace, graph, intent,
  policy, approval, effect, and outcome chains.
- Reversed mixed-tenant input projects exactly the 34 primary-tenant events in
  contiguous sequence order.
- Serialized projection contains no raw payload, idempotency key, actor ID,
  email address/body, recipient field, or bearer-token value.
- Three race schedules and six migration cases are present.
- All `L04-AC01..12` and `L04-N01..12` identifiers map to executable evidence.
- The authorized Stage 03 map contains no endpoint, route, middleware, worker,
  or new authentication surface.

## Negative verification behavior

The verifier fails closed on stale upstream hashes; undeclared product inputs;
missing schema objects or stable error codes; control/subject chain gaps;
payload-hash mismatch; cross-tenant projection; redaction leakage; missing
migration/race/criterion coverage; L14 scope entry; or any Stage 02 product-tree
modification.

## Result

`status: passed`. Verification opens the Stage 02 human gate and does not accept
it.
