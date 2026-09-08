---
type: verification-record
stage: 05_ship
status: passed
verified_at: 2026-09-08T06:43:47Z
environment: local-windows-node
truth_mode: FIXTURE
---

# L14 Stage 05 verification record

## Environment

- OS: `Microsoft Windows 10.0.26200`
- Node: `v22.15.0`
- Package manager: repository npm scripts with the existing lockfile
- Runtime evidence: accepted Stage 04 local Vinext HTTP probes
- Durable success evidence: migrated in-memory SQLite with labeled `FIXTURE` histories
- Release inventory: `115` existing non-generated files outside Stage 05 output
- Environment secret values read: none

## Artifact bindings

| Input | SHA-256 |
|---|---|
| `factory/05_ship/prepare.mjs` | `ffb2920821f3203046ce2b1d7f8a894e7b9192153520ec74dea45b6dbe2a391b` |
| `factory/05_ship/verify.mjs` | `4d7a6f8832dd1f7a1bbc49716f34048a2018f3acdcd7813d3de984e3ac3d2cac` |
| `factory/05_ship/output/RELEASE_MANIFEST.md` | `6f35ec6d6fdce63369ae53f8fe56ebf405c6600f14929341b503ed3b92106012` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `3f52ccb4f78243a9fb8e92d9182fb672eb8c2735c0b17c98dcc383cc4825f01a` |

## Commands

| Timestamp UTC | Command | Exit | Relevant result |
|---|---|---:|---|
| `2026-08-31T13:36:16Z` | `& 'C:\\Program Files\\nodejs\\npm.cmd' run demo:prepare` | `0` | Ended `13:36:17Z`; all `115` release-head files matched and the cold path required no hidden repair. |
| `2026-08-31T13:34:02Z` | `& '.\\node_modules\\.bin\\tsx.cmd' --test tests/flight-recorder-build.test.mjs` | `0` | Ended `13:34:07Z`; `57` passed, `0` failed, including both L14 success traces and all negative boundaries. |
| `2026-08-31T18:02:45Z` | `& 'C:\\Program Files\\nodejs\\npm.cmd' run lint` | `0` | Ended `18:02:51Z`; final ESLint completed without findings. |
| `2026-08-31T13:35:34Z` | `& 'C:\\Program Files\\nodejs\\npm.cmd' run build` | `0` | Ended `13:35:40Z`; five Vinext environments built and the dynamic L14 route was emitted. |
| `2026-08-31T18:02:45Z` | `git diff --check` | `0` | Ended `18:02:46Z`; no whitespace errors. |
| `2026-08-31T18:02:45Z` | `& '.\\node_modules\\.bin\\tsx.cmd' factory/05_ship/verify.mjs` | `0` | Release-head coverage, cold runbook, accepted Stage 04 evidence, output bindings, and open gate validated. |
| `2026-08-31T18:02:45Z` | `& 'C:\\Program Files\\nodejs\\node.exe' factory/status.mjs` | `0` | Ended `18:02:45Z`; Stages 01-04 complete and accepted, with Stage 05 dependencies and release head both fresh and waiting only on its human gate. |

## Stage-owned corrections

On `2026-09-08`, the accepted release was reopened after derived status found
that the release manifest retained an older `.gitignore` SHA-256. The manifest
now binds the unchanged checked-out file at
`0ca90faf73973374e38f6292defb0aa54ad15fc5bac552be25365a7fcd127f90`.
No product, schema, migration, runtime, fixture, or release-script file changed.
Cold preparation passed for all 115 files, the focused suite passed 57/57,
lint passed, the five-environment Vinext production build passed, and
`git diff --check` passed on Windows `10.0.26200.0` with Node `v22.15.0`.

The Stage 05 gate is open again because its reviewed artifact hashes changed.
Human acceptance is required before commit and seal.

The first cold-preparation attempt at `13:32:32Z` found that its runbook check
expected npm shorthand while the runbook used the absolute Windows npm path.
The helper assertion was corrected and the manifest rebound; the next run and
the final run passed.

The first Stage 05 lint at `13:34:03Z` found one unused verifier variable. The
redundant read was removed and the verifier hash was rebound; final lint passed.
Neither correction changed product code, accepted Stage 04 evidence, fixtures,
or durable data.

The first derived status check showed root dotfile bindings as stale because
leading-dot paths are resolved relative to the manifest directory. The three
root dotfile bindings were expressed as canonical `../../../...` paths, the helper
and manifest were rebound, and both cold preparation and derived status then
agreed on the same fresh 115-file head.

## Evidence disposition

The release manifest binds the complete governed release inventory and the
human gate separately binds all Stage 05 outputs. The cold runbook preserves
the `FIXTURE` label, distinguishes the local no-D1 HTTP boundary from durable
fixture success, and contains no repair step.

## Disposition

`status: passed`. Stage 05 opens its human gate and stops. Commit and seal are
not authorized until a human accepts the gate.
