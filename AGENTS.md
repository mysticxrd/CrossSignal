# CrossSignal ship lane

This checkout builds the CrossSignal hiring demo: an AI incident investigator
that reads company signals, names the change behind a revenue drop and
recommends an action a person must approve. The goal is visible, public
progress before December 2026. `CONTEXT.md` maps the folders.

## Factory frozen

The factory is frozen at tag `factory-freeze-2026-10-03` and does not govern
ship-lane work. Leave `factory/` unchanged (CI fails a PR that touches it),
don't create gate, seal, preservation, proposal or review files, and don't stop
for factory gates; `node factory/status.mjs` reports history only.

## Loop

I own the design and the merge; you build, prove and teach. A chore changes no
product behaviour (dependencies, docs, config, CI or tests only) and skips
Design and Teach.

1. Isolate: one worktree and branch (`claude/<slug>` or `codex/<slug>`) per
   task, from `origin/main`.
2. Design: run `/design`; wait for "build".
3. Build: one slice, under about 300 changed lines plus its nearest test, as
   one focused commit; `npm test` and `npm run lint` pass.
4. Review: run `/pr` to open the PR, then once per CodeRabbit review, for at
   most three rounds.
5. Teach: run `/walkthrough` on the PR; it ends with my manual test.
6. Merge: I squash-merge. Remove the worktree; the next slice starts from the
   updated `origin/main`.
7. Deploy: `npm run deploy:replay` publishes only replays, labelled with run
   id, date and model.

Settle design choices yourself and list the alternatives I can overrule in a
word; no `TODO(human)`. One agent per task; start a fresh one only for a review
or a wide search. `docs/owner/` is mine: read it, never write it.
Codex: `/name` means `.claude/skills/name/SKILL.md`.

## Done

A slice is done when:
- `npm test` and `npm run lint` pass;
- the PR states my decision and the proof: test results always, before and
  after screenshots for UI, and B01 against the baseline for prompt, tool or
  schema changes;
- the reviewer has nothing open, or three rounds are used and every remaining
  finding has an answer;
- for a product change, I've had the walkthrough and run the manual test;
- I merged it.

## Tools

| Tool | When |
|---|---|
| `/design` | Before a product change: brainstorm, then the design and my decision |
| `/pr` | When the build passes, then once per review round |
| `/walkthrough` | After review, before I merge a product change |
| `/handoff` | Context past about half, or a session ending mid-task |
| `/grill` | Weekly, on the week's biggest change; the gaps feed the post |
| `/drill` | When I want to rebuild something by hand |
| CodeRabbit | Reviews every PR on GitHub |
| B01 | Prompt, tool or schema changes; see Model calls |
| A01 | One live investigation; see Model calls |

A task with more than one slice, or one that spans sessions, keeps `plan.md`,
`handoff.md` and `notes.md` in `work/tasks/<slug>/` (gitignored). Before the
last merge, move what's worth keeping into code comments or the PR.

## Model calls

- Gemini free tier only (`gemini-3.5-flash-lite`); paid spend is never
  allowed. The runner refuses to send unless the account attestation says
  billing is off with no paid fallback.
- The key comes from `GEMINI_API_KEY` (environment or a gitignored `.env`).
  Never print, log or commit it. Failures print Google's full error with
  only the key hidden.
- Retries cover 429/500/503/504 only, bounded and inside the request deadline.
- Requests, retries included, start at least 4.5 s apart (free tier: 15 a
  minute). The spacing holds within one process, so run one batch at a time,
  in one worktree at a time.
- `node scripts/run-a01-gemini.mjs` runs one investigation, saved under
  `outputs/a01-gemini/` (gitignored).
- `node scripts/run-b01.mjs [--new] [--profile minimal|low] [--sets ...]` runs the
  benchmark; `minimal` is the B01 baseline, `low` adds LOW thinking with larger caps.

## Choosing work

Ask: "Will this show up in the demo or in this week's post?" If not, skip it.
Each week's post explains one thing I couldn't explain before.
Spend two hours on the simplest fix before writing any doc about a problem.
Change this workflow only when the same failure happens twice.
