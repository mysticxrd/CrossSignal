# CrossSignal ship lane

This checkout builds the CrossSignal hiring demo: an AI incident investigator
that reads company signals, names the change behind a revenue drop and
recommends an action a person must approve. The goal is visible, public
progress before December 2026.

## Factory frozen

The factory is frozen at tag `factory-freeze-2026-10-03`; `CONTEXT.md` and
`factory/` describe that process and do not govern ship-lane work. Do not edit
`factory/**/output/`, create gate, seal, preservation, proposal or review files,
or stop for factory gates; `node factory/status.mjs` reports history only.

## Owner loop

I own the design; you build and teach. Chores skip steps 1, 2, 4, 5.
1. Predict: get my prediction before yours.
2. Design: run `/design`; wait for "build".
3. Build: a reviewable slice and its nearest test; `npm test`, `npm run lint` pass.
4. Teach: run `/walkthrough` on the diff.
5. Own: decide; list alternatives to overrule; no `TODO(human)`; never write `docs/owner/`.
6. Commit: one focused, working commit per change.
7. Deploy: none yet; demo replays recorded runs labelled with run id, date and model.
Codex: `/name` means `.claude/skills/name/SKILL.md`.

## Model calls

- Gemini free tier only (`gemini-3.5-flash-lite`); paid spend is never
  allowed. The runner refuses to send unless the account attestation says
  billing is off with no paid fallback.
- The key comes from `GEMINI_API_KEY` (environment or a gitignored `.env`).
  Never print, log or commit it. Failures print Google's full error with
  only the key hidden.
- Retries cover 429/500/503/504 only, bounded and inside the request deadline.
- Requests, retries included, start at least 4.5 s apart (free tier: 15 a
  minute). Run one batch at a time.
- `node scripts/run-a01-gemini.mjs` runs one investigation, saved under
  `outputs/a01-gemini/` (gitignored).
- `node scripts/run-b01.mjs [--new] [--profile minimal|low] [--sets ...]` runs the
  benchmark; `minimal` is the B01 baseline, `low` adds LOW thinking with larger caps.

## Choosing work

Ask: "Will this show up in the demo or in this week's post?" If not, skip it.
Each week's post explains one thing I couldn't explain before.
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
