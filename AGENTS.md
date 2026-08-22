# Company Flight Recorder

This repository holds a durable product prototype and the ICM/MWP factory that
turns it into one evaluator-verifiable Company Flight Recorder slice.

## Start

1. Read `CONTEXT.md` to route the task.
2. For governed build work, read `factory/CONTEXT.md`.
3. Read only the active stage's `CONTEXT.md`, its declared inputs, and the two
   shared references it names.
4. Stop after writing the stage outputs; a person owns the gate.

## Map

| Path | One job |
|---|---|
| `factory/` | `spec -> data -> build -> verify -> ship` pipeline and reviewed artifacts |
| `factory/_shared/` | Stable product and quality constraints |
| `factory/_templates/` | Blank hardened stage contract |
| `app/`, `db/`, `drizzle/`, `worker/` | Durable product implementation |
| `tests/` | Product and workspace verification |
| `_archive/` | Superseded history; excluded from normal loading |

## Route

| Need | Go to |
|---|---|
| Understand the current product decision | `factory/_shared/ARCHITECTURE_SNAPSHOT.md` |
| Start or continue the governed build | `factory/CONTEXT.md` |
| Make a tiny, low-risk correction | `CONTEXT.md` express lane |
| Diagnose an incident or broad refactor | `CONTEXT.md` direct engineering lane |
| Inspect historical CrossSignal decisions | `_archive/2026-08-12-crosssignal-phase-00/README.md` |
| Report status | Run `node factory/status.mjs`; it derives state without writing a table |

Never load `_archive/`, the whole Obsidian vault, or every stage unless the task
explicitly requires historical comparison. Nothing advances past a stage until
its human gate is accepted.
