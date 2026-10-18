# CrossSignal folder map

Where things live, so a task starts from the right files. `AGENTS.md` says how
to work. The frozen factory's task router, which this file replaced, is kept at
tag `factory-freeze-2026-10-03`.

## Product

| Path | Holds |
|---|---|
| `app/` | UI, server actions and the public replay page (`app/runs/[runId]/`) |
| `db/` | Cases from investigation to outcome, the schema and database runtimes |
| `db/a01/` | The A01 investigator, its tools and store |
| `db/benchmark/` | Gemini request, transport, budget and schemas |
| `db/cases/` | The SaaS Case lab: simulated world, conversion measurement, Case store, approval, execution and outcome |
| `db/replays/` | Committed replays, their timestamp proofs and `stamps.json` |
| `worker/` | The Cloudflare Worker, including the read-only replay gate |
| `supabase/`, `drizzle/` | Database functions, migrations, queries and scenarios |
| `data/ga4-merch/` | The GA4 merch-store daily data |
| `build/`, `public/` | The build plugin and static assets |

## Running and proving

| Path | Holds |
|---|---|
| `scripts/` | Entry points: A01, B01, replays, deploy and SQL generators |
| `tests/` | `npm test` suites; `scripts/test-offline.mjs` lists the retired ones |
| `tests/evaluator/` | Grader, rubrics and the batch comparison |
| `reports/` | Committed benchmark and replay results |
| `docs/` | Phase notes and decisions |
| `docs/owner/` | The owner's own notes |

## Workflow

| Path | Holds |
|---|---|
| `.claude/skills/` | `/design`, `/pr`, `/walkthrough`, `/handoff`, `/grill`, `/drill` |
| `.claude/hooks/` | The hook that keeps Claude's tools out of `docs/owner/` |
| `.github/workflows/ci.yml` | Lint, tests and the factory freeze check |

## Local only (gitignored)

| Path | Holds |
|---|---|
| `work/tasks/<slug>/` | A long or hard task: `plan.md`, `handoff.md` (newest first), `notes.md` |
| `work/drills/<slug>/` | `/drill` exercises |
| `outputs/` | Local A01 and B01 runs |

## History

| Path | Holds |
|---|---|
| `factory/` | The frozen spec → data → build → verify → ship pipeline and its evidence |
| `_archive/` | Superseded phases |
| `examples/` | Starter-template examples, not product code |

Load `_archive/`, the whole Obsidian vault or every factory stage only when the
task asks for a historical comparison.
