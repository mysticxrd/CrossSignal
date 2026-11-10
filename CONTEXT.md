# CrossSignal folder map

Where things live, so a task starts from the right files. `AGENTS.md` says how
to work. The frozen factory's task router, which this file replaced, is kept at
tag `factory-freeze-2026-10-03`.

## Product

| Path | Holds |
|---|---|
| `app/` | UI, server actions and the public replay page (`app/runs/[runId]/`) |
| `case-lab/` | The SaaS Case lab's browser page, served by `npm run case:lab` |
| `db/` | Cases from investigation to outcome, the schema and database runtimes |
| `db/a01/` | The A01 investigator, its tools and store |
| `db/benchmark/` | Gemini request, transport, budget and schemas |
| `db/cases/` | The SaaS Case lab: simulated world, conversion measurement, Case store, approval, execution and outcome |
| `db/replays/` | Committed replays, their timestamp proofs and `stamps.json` |
| `order-recovery/` | v0.2: the simulated order worlds for Razorpay #670 and #664 (`worlds/`), the code-only rival scripts and the simulators; #664's code is in `refund-ordering/` |
| `worker/` | The Cloudflare Worker, including the read-only replay gate |
| `supabase/`, `drizzle/` | Database functions, migrations, queries and scenarios |
| `data/ga4-merch/` | The GA4 merch-store daily data |
| `build/`, `public/`, `.openai/` | The build plugin, static assets and the hosting config the plugin copies into `dist/` |

## Running and proving

| Path | Holds |
|---|---|
| `scripts/` | Entry points: A01, B01, order recovery, the held-out seal check, the Case lab, replays, deploy and SQL generators |
| `tests/` | `npm test` suites; `scripts/test-offline.mjs` lists the retired ones |
| `tests/evaluator/` | Graders, rubrics and the batch comparison; `order-recovery/` holds the v0.2 cost grader and its answer keys |
| `reports/` | Committed results: B01 (`b01-w1/`, `b01-twins/`), order recovery with the held-out commitment (`order-recovery/`), the golden-case replay and the scenario matrix |

## Workflow

| Path | Holds |
|---|---|
| `.claude/skills/` | `/design`, `/pr`, `/walkthrough`, `/handoff`, `/grill`, `/drill` |
| `.agents/skills/` | Codex's entry point to `/grill`; Codex reads the other skills from `.claude/skills/` |
| `.claude/hooks/` | The hook that keeps Claude's tools out of `docs/owner/` |
| `.claude/settings.json` | Runs that hook and sets Claude's output style |
| `.github/workflows/ci.yml` | Lint, tests and the factory freeze check |
| `docs/owner/` | The owner's own notes |

## Local only (gitignored)

| Path | Holds |
|---|---|
| `work/tasks/<slug>/` | A long or hard task: `plan.md`, `handoff.md` (newest first), `notes.md`, `walkthrough.md` |
| `work/drills/<slug>/` | `/drill` exercises |
| `outputs/` | Local runs: A01, the B01 batches the reports cite (`outputs/b01/<date>`), Case lab state and drafts |
| `exa-results/` | Web research saved by search tools |

Each worktree has its own `work/` and `outputs/`, and removing the worktree
deletes them. One checkout is kept as home and never removed: plans and
batches that must outlast a task are copied there before its worktree goes.

## History

| Path | Holds |
|---|---|
| `factory/` | The frozen spec → data → build → verify → ship pipeline and its evidence |
| `docs/` (all but `owner/`) | Phase notes and decisions from before the freeze; the factory's checks read these files, so they stay where they are |
| `_archive/` | Superseded phases |
| `examples/` | Starter-template examples, not product code |

Load `_archive/`, `docs/` or the factory's stages only when the task asks for
a historical comparison. Current decisions are in the merged PRs and the
README.
