# Company Flight Recorder - task router

One job: route work without loading the whole repository.

## Current product direction — 2026-09-26

Read [Hiring MVP direction](docs/hiring-mvp-direction.md) before choosing the
next product task. The selected milestone is one complete synthetic A01
investigation and approved intervention. Existing Mobile Safari replay and
the local detector matrix remain regression coverage. Real checkout, payment
sandbox, device verification, and business recovery are separate future work.

The current factory run is A01. Start with `factory/CONTEXT.md`, then its
active stage. Spec, Data, Build and Verify were explicitly accepted. Stage 05
packages the local mechanics preview for final review, with model/human-demo
gaps still explicit. See the [current release checkpoint](docs/a01-release-status.md).
The direction/handoff documents are preserved Spec source snapshots. The
[transition record](factory/TRANSITION.md) binds the sealed baseline and
preserved historical L14 run. The prior compiled architecture snapshot is
historical; A01 uses `factory/_shared/A01_DIRECTION.md` and the existing
quality gates. Neither historical acceptance nor phase numbers establishes
hiring-MVP completion.

## Routes

| Work | Read | Operating mode |
|---|---|---|
| Feature, schema, security, authority, external effect, or public-behavior change | `factory/CONTEXT.md`, then the active stage contract | Full ICM/MWP pass |
| Current product or architecture question | `docs/hiring-mvp-direction.md`, `factory/_shared/A01_DIRECTION.md` | Read-only answer or source-edit proposal |
| Tiny single-file change with no schema, security, authority, or public-contract effect | The target file and its nearest test | Express lane: edit, targeted test, stop |
| Incident or cross-cutting refactor | Affected code and tests only | Direct engineering workflow; back-port only recurring lessons |
| Historical audit | `_archive/2026-08-12-crosssignal-phase-00/README.md` | Load archive files by explicit path |

## Loading rule

For a factory stage, load its `CONTEXT.md`, the exact working inputs it names,
and only the named files under `factory/_shared/`. Do not load later stages,
the superseded archive, generated build directories, dependencies, or the whole
Obsidian vault.

## Ownership

- The vault note named in the architecture snapshot is the authoring source.
- The hash-stamped snapshot is the approved factory reference for this run.
- Stage outputs are human-editable handoffs and verification evidence.
- Accepted application code and migrations live in the durable product tree.
- Runtime persistence, concurrency, authorization, and effects remain product
  infrastructure; the filesystem factory never impersonates the live runtime.

Read `factory/CONTEXT.md` to derive current pipeline status.
