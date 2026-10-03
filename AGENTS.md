# CrossSignal ship lane

This checkout builds the CrossSignal hiring demo: an AI incident investigator
that reads company signals, names the change behind a revenue drop and
recommends an action a person must approve. The goal is visible, public
progress before December 2026.

## Factory frozen

The `spec -> data -> build -> verify -> ship` factory is frozen at tag
`factory-freeze-2026-10-03`. `CONTEXT.md` and `factory/` describe that frozen
process; they do not govern ship-lane work.

- Do not edit `factory/**/output/`; frozen evidence stays as it is.
- Do not create gate, seal, preservation, proposal or review files.
- Do not stop for human gates. `node factory/status.mjs` reports history only.

## Loop: fix -> test -> commit -> deploy

1. Fix: make the smallest change that moves the demo forward.
2. Test: add or update the nearest test; `npm test` and `npm run lint` pass.
3. Commit: one focused, working commit per change.
4. Deploy: no free host is wired up yet. Until one is, the demo replays
   recorded runs, each labelled with its run id, date and model.

## Model calls

- Gemini free tier only (`gemini-3.5-flash-lite`); paid spend is never
  allowed. The runner refuses to send unless the account attestation says
  billing is off with no paid fallback.
- The key comes from `GEMINI_API_KEY` (environment or a gitignored `.env`).
  Never print, log or commit it. Failures print Google's full error with
  only the key hidden.
- Retries cover 429/500/503/504 only, bounded and inside the request deadline.
- Run one investigation with `node scripts/run-a01-gemini.mjs`; each run is
  saved under `outputs/a01-gemini/` (gitignored).

## Choosing work

Ask: "Will this show up in the demo or in this week's post?" If not, skip it.
Spend two hours on the simplest fix before writing any doc about a problem.

## Map

| Path | One job |
|---|---|
| `app/`, `db/`, `worker/` | Product code: UI, data and the investigation runner |
| `db/benchmark/` | Gemini request, transport, budget and schemas |
| `scripts/` | Runnable entry points |
| `tests/` | `npm test` suites |
| `factory/` | Frozen pipeline and evidence; read-only |

Never load `_archive/`, the whole Obsidian vault, or every factory stage unless
the task explicitly requires historical comparison.
