---
type: release-manifest
stage: 05
status: ready-for-review
release_id: crosssignal-l08-authority-correction-v1
version: 0.1.1
trace_id: trace_d12fc25947ed88cd
truth_mode: FIXTURE
effect_mode: TEST
corrected_finding: L08
---

# CrossSignal L08 authority-correction release

CrossSignal is a human control layer for consequential agent actions. This
release packages one post-release correction: a superseded intent cannot gain
authority after a replacement becomes the trace's active intent. It does not
claim that the other audit findings are resolved.

## Release identity

| Field | Value |
|---|---|
| Release | `crosssignal-l08-authority-correction-v1` |
| Version | `0.1.1` |
| Corrected finding | `L08` — edit/authorize active-intent race |
| Golden UI trace | `trace_d12fc25947ed88cd` |
| Data mode | `FIXTURE` |
| Effect mode | `TEST` adapter |
| Accepted upstream gate | Stage 04 Verify, accepted 2026-08-23 |
| Reviewer path | Deterministic production-operation and SQLite regression commands |

## Corrected invariant

`flight_traces.active_intent_id` is the sole database-owned runtime authority
head. Grant creation, effect reservation, the executing compare-and-swap, and
the executing event must all bind the same exact active identity inside the
transaction. The normal runtime never infers the active intent from time, insertion order, `rowid`, or an aggregate.

The stable losing-operation errors are:

- `l08_stale_or_superseded_intent` when a stale authorization loses;
- `l08_intent_activation_rejected` when a replacement loses.

## Truth manifest

| Claim | Established | Explicit non-claim |
|---|---|---|
| Edit wins | v2 activates atomically; the complete stale v1 authorization batch aborts; exact v2 succeeds once. | No optimistic or application-only stale check is claimed. |
| Authorization wins | v1 commits one effect; the losing v2 intent and policy both roll back. | No partial replacement is tolerated. |
| Authority head | Exact persisted identity controls authorization and effects. | Runtime order is not authority. Migration backfill alone reads legacy order. |
| Database enforcement | Six L08 triggers, two indexes, and exact-head columns fail closed under ten direct attacks. | The UI is not treated as the authority boundary. |
| Migration | Migration 0006 covers empty, pending-v1, pending-v2, completed-v1, and invalid historical race states. | A mismatched historical database is rejected, not guessed into validity. |
| Effects | Confirmed, failed, and indeterminate paths reserve once and do not blindly retry. | Exactly-once delivery is not claimed. |
| UI story | The unchanged local UI remains FIXTURE data through a TEST adapter and labels outcomes as Correlated, not proven. | The single-user UI does not visually prove tenant isolation. |

## Architecture

```text
exact immutable intent
  -> matching deterministic policy
  -> guarded active_intent_id transition
  -> exact payload-bound human grant
  -> guarded effect reservation
  -> active-head compare-and-swap
  -> executing-event projection assertion
  -> TEST result with no blind retry and no silent retry
```

The authority head is persisted state, not a query convention. The legacy
`created_at, rowid` order exists only inside migration 0006 to backfill old
databases before permanent guards are installed.

## Threat model

| Threat | Release response | Proof |
|---|---|---|
| Replacement commits while v1 authorization is paused | The stale grant/effect batch aborts inside SQLite with zero partial writes. | Deterministic edit-wins schedule |
| v1 authorization commits while v2 replacement is paused | v2 intent and policy roll back together; v1 remains the one active effect. | Deterministic authorization-wins schedule |
| Stale grant or stale effect inserted directly | Active-head triggers reject the write. | Direct attacks 1–2 |
| Cross-workspace or cross-trace head | Pointer trigger rejects the relationship. | Direct attacks 3–4 |
| Cleared, backward, or non-predecessor head | Transition and required-head triggers reject it. | Direct attacks 5–7 |
| Kill-switch execution or grant replay | Existing authority and uniqueness guards reject it. | Direct attacks 8–9 |
| Zero-row execution compare-and-swap | The following in-batch event projection raises and rolls the batch back. | Direct attack 10 |
| Invalid historical authority during migration | Migration aborts with `migration_l08_historical_authority_mismatch` and restores 0005 schema/data. | Five-case migration matrix |

## Cold setup

Requires Node.js `>=22.13.0` and the checked-in dependencies.

```powershell
npm install
node factory/05_ship/prepare.mjs
node factory/04_verify/verify.mjs
node --import tsx --test tests/flight-recorder-build.test.mjs
node factory/05_ship/verify.mjs
```

`prepare.mjs` verifies the complete current schema. If it finds the known
project-local legacy database with an empty Wrangler ledger, it first proves
the complete 0005 object set, records only the 0000–0005 baseline without
deleting data, applies migration 0006, then checks both columns, both indexes,
and all six L08 triggers. A second run is idempotent.

The deterministic verifier uses real `authorizeAndExecute` and
`replacePendingIntent` production operations with manual promise barriers. It
requires no browser timing, hidden database edit, oral correction, or copied
authorization validator.

## Migration and rollback

| State | Expected cold result |
|---|---|
| Empty database | All migrations apply; no active head is invented. |
| Pending v1 | v1 becomes the active head. |
| Pending v2 | v2 becomes active and points to v1 as its predecessor. |
| Completed v1 | v1 and its authority history remain intact. |
| Invalid historical race | Migration aborts; 0006 columns and guards roll back; the 0005 immutability trigger remains. |

Do not delete or hand-edit a database to make migration pass. The preparation
script refuses an empty-ledger database unless it matches the complete 0005
baseline.

## Deterministic regression commands

```powershell
node factory/04_verify/verify.mjs
node --import tsx --test tests/flight-recorder-data.test.mjs
node --import tsx --test tests/flight-recorder-build.test.mjs
node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern _archive
node_modules/.bin/vinext.cmd build
node_modules/.bin/tsx.cmd --test factory/_lib/factory-tools.test.mjs tests/rendered-html.test.mjs tests/icm-workspace.test.mjs tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs tests/flight-recorder-ship.test.mjs
git diff --check
```

## Proof index

| Question | Primary proof |
|---|---|
| What changed? | [Stage 03 Build evidence](../../03_build/output/BUILD_EVIDENCE.md) |
| Was the correction independently verified? | [Stage 04 Verification report](../../04_verify/output/VERIFICATION_REPORT.md) |
| Was Verify accepted by the owner? | [Accepted Stage 04 gate](../../04_verify/output/HUMAN_GATE.md) |
| Where is the migration? | [Migration 0006](../../../drizzle/0006_l08_active_intent_authority.sql) |
| Where are both production race schedules and attacks? | [Build tests](../../../tests/flight-recorder-build.test.mjs) |
| How is the local database prepared safely? | [Cold preparation](../prepare.mjs) |
| Which release checks are executable? | [Ship verifier](../verify.mjs) and [Ship tests](../../../tests/flight-recorder-ship.test.mjs) |
| Is the unchanged UI still reviewable? | [Existing FIXTURE/TEST walkthrough](DEMO_SCRIPT.md) |

## Remaining findings

This release closes only `L08`.

| Finding | Status after this release |
|---|---|
| `L06` | Open — graph executor work is not included. |
| `L20` | Open — fixture drift is not reconciled here. |
| `L04` | Open/narrower — authority-history surface work is not included. |
| `L14` | Open/enhancement — not included. |

## Residual limits

- FIXTURE evidence and a TEST adapter remain explicit; no live provider,
  production scale, exactly-once delivery, or causal impact is claimed.
- Failed and indeterminate effects have no automatic retry. Reconciliation or
  a new exact intent and human authorization is required.
- The single-user UI does not visually prove tenant isolation; database tests
  own that evidence.
- This standalone project claims no knowledge of Result's private stack, APIs,
  topology, security model, roadmap, or hiring rubric.
- Existing screenshots and the prior 90-second UI walkthrough describe the
  unchanged earlier release surface; they are not evidence for the L08 race
  correction.

## Declared input bindings

Text hashes normalize CRLF to LF. Directory hashes bind sorted repository
paths and file hashes.

| Input | SHA-256 |
|---|---|
| `factory/05_ship/CONTEXT.md` | `bf38c74f5a2058a8764e957af0ec548562f68476089f3430bb9d282b818d3696` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `aa42efe813a0094ec7c8e5f38b6341eb4a13af5fb8b89db5e78cf59906e3c95d` |
| `factory/04_verify/output/HUMAN_GATE.md` | `f05b2633e059491f7859e73fae6e326a1a378e4eea971bd8f9280526f09edb14` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `README.md` | `7e140c6ebeb75777e9302af506d710ff74444633b5fa2744f61553ec959bf192` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `app/` | `9865c5d5340a0e639331eeb16156328553383d6636a1935b169885ad8eb6ec43` |
| `db/` | `ad46cd3a68b59b856c8486a19c57b0923fcf89369053a3c89dc1e538435a9f3a` |
| `drizzle/` | `657a19f27d02825948066cae38aea401c41f27d293f008f8249aaac8e9b0a252` |
| `worker/` | `8e9098389533594afeb27c533357aa71ca2a2eca189b409a1f55affb4981b568` |
| `tests/` | `394a2e5e1de2674abef33f7c301d2ac781982ecb206ff80fd81d4274cbaeabda` |
| `factory/02_data/fixtures/superseded-intent-authority.fixture.mjs` | `b49748c7305ac896e8a756dd5d8ba6733a79dc89eed0dad3438db9b24cb1fea8` |
| `factory/03_build/verify.mjs` | `4a959cf71527cd3a4d6fa9b6a9f3e1d8b1fbfcdd6f4643581beebe8c48a4e7fd` |
| `factory/04_verify/verify.mjs` | `3af84eca50fffcbb8d2ad994477ff3b3ecf56329affd3e4fd35845ea6aa23adc` |
| `factory/05_ship/prepare.mjs` | `517ecde6b946bddc9861aa156e2e17b2ae3baa4e8268a23271e492e3043988f1` |
| `factory/05_ship/verify.mjs` | `e555ccb190c9a9c85bbc0eaa11dfc1011b7c031c058a5c05dbcafa8f502f9d82` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `a13a3dec87df61d8babf36aefb5813961a509d89dab282c771a037f88a802b62` |
