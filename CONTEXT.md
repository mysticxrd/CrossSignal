# Company Flight Recorder - task router

One job: route work without loading the whole repository.

## Routes

| Work | Read | Operating mode |
|---|---|---|
| Feature, schema, security, authority, external effect, or public-behavior change | `factory/CONTEXT.md`, then the active stage contract | Full ICM/MWP pass |
| Product or architecture question | `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | Read-only answer or source-edit proposal |
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
