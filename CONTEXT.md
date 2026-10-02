# Company Flight Recorder - task router

One job: route work without loading the whole repository.

## Authoritative checkout and execution state

Run product work in `C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1`.
The parent `C:/Users/hisha/ChatGPT/CrossSignal` is the project root and a separate
historical repository; its factory and planning candidates do not drive this run.
Verify this checkout's Git status/HEAD and run `node factory/status.mjs` before
resuming. That command derives the first incomplete stage from gates, verification
and dependency freshness. Read only that stage's contract, declared inputs and
the two shared references it names. Current observations and preservation review
are in the [workspace cleanup manifest](../../planning/2026-10-01-workspace-cleanup/MANIFEST.md).

## Current product direction — 2026-10-02

Read [API benchmark charter](docs/api-benchmark-charter.md) and
[planning reconciliation](docs/benchmark-planning-reconciliation.md). The next
milestone measures a bounded API investigator on five different causal cases,
compares rules and single-shot/tool models, analyzes failures and measures one
change. No local-model setup is required. Provider selection and execution
conditions follow the derived active stage's contract. The October 2 review
found Gemini preparation selected with conditional $0 requests requiring verified
account, billing, quota and original-limit compatibility. No model evaluation
has run. This clarity pass does not resume that operation or grant requests.

The current run is `b01-api-behavioral-benchmark`. The user confirmed transition
and Stage 01 entry on October 1. Start with `factory/CONTEXT.md`, derive status,
then read only the active stage. Stage acceptance remains a separate human gate.
The [transition record](factory/TRANSITION.md) binds the sealed A01 baseline
`43d42d255bd22cb227e3410dda31ffb8437f6624` and complete preserved factory.

The original planning documents' pending-provider and between-run language is
dated source text; Spec/Data are now accepted according to the October 2 status
check. The selected Gemini route retains their original benchmark token limits.
The accepted SIWC amendment and its pending Data compatibility review remain
preserved history; the SIWC profile is not selected. The
[cleanup reconciliation](../../planning/2026-10-01-workspace-cleanup/MANIFEST.md#planning-reconciliation)
also distinguishes the September 30 Notion local-model proposal from API work.

The historical [hiring direction](docs/hiring-mvp-direction.md),
[A01 release checkpoint](docs/a01-release-status.md), A01 direction reference
and compiled architecture snapshot retain their accepted source text. Their
old next-step/status prose is historical. A01's five branches establish local
deterministic mechanics, not five-case diagnosis quality or hiring-MVP completion.
Model evaluation and actual runtime-human intervention remain NOT_RUN. Complete
one exact approved SIMULATED intervention within B01; stage acceptance never
grants rollback authority. Mobile Safari real-check/follow-up work remains deferred.

## Routes

| Work | Read | Operating mode |
|---|---|---|
| Feature, schema, security, authority, external effect, or public-behavior change | `factory/CONTEXT.md`, then the active stage contract | Full ICM/MWP pass |
| Current product or architecture question | `docs/api-benchmark-charter.md`, `docs/benchmark-planning-reconciliation.md`, `factory/_shared/BENCHMARK_DIRECTION.md` | Read-only answer or source-edit proposal |
| Tiny single-file change with no schema, security, authority, or public-contract effect | The target file and its nearest test | Express lane: edit, targeted test, stop |
| Incident or cross-cutting refactor | Affected code and tests only | Direct engineering workflow; back-port only recurring lessons |
| Historical audit | `_archive/2026-08-12-crosssignal-phase-00/README.md` | Load archive files by explicit path |

## Loading rule

For a factory stage, load its `CONTEXT.md`, the exact working inputs it names,
and only the named files under `factory/_shared/`. Do not load later stages,
the superseded archive, generated build directories, dependencies, or the whole
Obsidian vault.

## Ownership

- Current intent is recorded in the API charter, accepted Spec/Data and later
  reviewed stage decisions; historical vault/architecture snapshots retain
  their source provenance.
- Only the active stage's named hash-bound references supply its current
  factory constraints. The old compiled architecture snapshot is historical.
- Stage outputs are human-editable handoffs and verification evidence.
- Accepted outputs, gates and hash-bound inputs remain immutable; propose a
  source/binding correction through its review path instead of concealing drift.
- Accepted application code and migrations live in the durable product tree.
- Runtime persistence, concurrency, authorization, and effects remain product
  infrastructure; the filesystem factory never impersonates the live runtime.

Use `factory/CONTEXT.md` for pipeline rules and `node factory/status.mjs` for
current state. Stop at the active stage's human gate; factory acceptance and
runtime intervention authority remain separate.
