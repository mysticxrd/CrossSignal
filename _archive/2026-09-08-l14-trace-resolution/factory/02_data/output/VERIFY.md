---
type: verification-record
stage: 02_data
status: passed
verified_at: 2026-08-31T10:24:04.803Z
---

# L14 Stage 02 verification

## Result

`passed`

The corrected executable data package supplies two tenant-owned success traces, five
fail-closed corruption variants, fourteen acceptance IDs, twelve negative
cases, exact HTTP shapes, deterministic redaction evidence, and no durable
product change.

## Environment

| Property | Value |
|---|---|
| OS | `Microsoft Windows NT 10.0.26200.0` |
| Node.js | `v22.15.0` |
| Git | `2.47.1.windows.1` |
| Working branch | `codex/l14-authenticated-trace-resolution` |

## Commands

| Command | Exit | Relevant result |
|---|---:|---|
| `node factory/02_data/verify.mjs` | `0` | `2 tenant success traces, 5 corruptions, 14 acceptance IDs, 12 negative cases` |
| `git diff --check` | `0` | No whitespace errors |
| `git diff --name-only -- app db drizzle worker tests` | `0` | Empty; Stage 02 changed no durable product surface |

The first verifier run found that explanatory prose cited `NEG-L14-11` before
the ordered negative mapping. The document check was corrected to validate the
complete unique ID set; canonical negative ordering remains independently
enforced by `fixture.negativeCases` against `fixture.negativeIds`. No data
contract or fixture value changed.

A Stage 03 integration run then exposed that the accepted fixture represented
one graph node while the persisted runtime emits all six. Stage 03 was
preserved and removed from the working tree; this Stage 02 correction expands
the same L04 graph event templates across all six registered nodes. The
pending/completed contract counts now match the runtime at `28` and `49`.

## Executable checks

- The fixture validates with zero errors and has canonical digest
  `3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4`.
- Pending and completed success projections contain exactly 28 and 49 events.
- Every event is contiguous and has only the twelve accepted event fields.
- Every error has only `{ error: { code } }` and contains no partial events.
- All non-disclosing attacks reuse byte-identical `trace_not_found` data.
- Unknown secret-bearing events retain order with empty `details`.
- Repeated-read before/after durable counts are identical.
- The fixture root and nested values are deeply frozen.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `592edb4458d1eff71887ace8f33e240229dd31f66db28c7f54d9b3c5af4dadb7` |
| `factory/01_spec/output/SPEC.md` | `b09aafe97ecfdd4e6c3085426275b7505c906766023f374e2d7d68f2e2202371` |
| `factory/01_spec/output/HUMAN_GATE.md` | `656fc931fe34749c2b1e3db29e6d15e80a0abae1c016d6047679ce410a45a584` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `app/chatgpt-auth.ts` | `4265a2e7c2dcb3a6f4b7026f762bf5b6e4caec76cc13c0a45987ee9a9f2e42cc` |
| `app/crosssignal-auth.ts` | `4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0` |
| `db/workspaces.ts` | `d7f5b0d47fd294f2055c8f9247d9b8f5a0a7a1eb9c86e2daf5cb9d917e1a8eb6` |
| `db/flight-recorder-schema.ts` | `18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/flight-recorder.ts` | `4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0` |
| `tests/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |

## Output bindings at verification

| Output | SHA-256 |
|---|---|
| `factory/02_data/output/DATA_PACKAGE.md` | `a63729a4927b0b2688f0ce0e15f005cc62e013de97b79cdf8759aa6a078b6cb0` |
| `factory/02_data/output/HUMAN_GATE.md` | `1db548605ae225aa185096cb2e2a2bef10e698d84baa0737f55a5e5025b59b09` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |
| `factory/02_data/verify.mjs` | `5729372ae6041ac66da09a51556d6c56b2963852221af3183753aef91ab0da5a` |

## Gate

Verification has opened the Stage 02 human gate. It remains `pending`; Stage
03 must not begin until a reviewer accepts and binds the final data package and
verification hashes.
