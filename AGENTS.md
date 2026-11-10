# CrossSignal ship lane

This checkout builds the CrossSignal hiring demo. v0.1 is an AI incident
investigator that reads company signals, names the change behind a revenue
drop and recommends an action a person must approve. v0.2, the current work,
tests whether a model can beat a code-only script at putting stuck orders
right, on simulated orders anchored to two public Razorpay plugin bug reports.
The goal is visible, public progress before December 2026. `CONTEXT.md` maps
the folders.

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
4. Review: run `/pr` to open the PR, then once per Codex review, for at most
   three rounds.
5. Teach: run `/walkthrough` on the PR; it ends with four questions on the
   principle the build applies.
6. Merge: I squash-merge. Remove the worktree; the next slice starts from the
   updated `origin/main`. If its `node_modules` is a link to another
   checkout's, unlink it first (`cmd /c rmdir <worktree>\node_modules`), or
   deleting the folder empties the shared copy.
7. Deploy: `npm run deploy:replay` publishes only replays, labelled with run
   id, date and model.

Settle design choices yourself and list the alternatives I can overrule in a
word; no `TODO(human)`. One agent per task; start a fresh one only for a review
or a wide search. `docs/owner/` is mine: read it, never write it.
Codex: `/name` means `.claude/skills/name/SKILL.md`.

## Done

A slice is done when:
- `npm test` and `npm run lint` pass;
- the PR states my decision and the proof: test results always, and for
  prompt, tool or schema changes the benchmark that change touches against
  its baseline: B01 for the v0.1 investigator, the order-recovery reports for
  v0.2 (UI screenshots, before and after, come in the walkthrough, since `gh`
  can't attach images);
- the reviewer has nothing open, or three rounds are used and every remaining
  finding has an answer;
- for a product change, I've had the walkthrough;
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
| Codex review | Reviews each PR on GitHub when it opens and on `@codex review` |
| B01 | Prompt, tool or schema changes to the investigator; see Model calls |
| A01 | One live investigation; see Model calls |
| Order recovery | v0.2 changes; see Order recovery |
| Case lab | `npm run case:lab`: the SaaS Case lab in a browser |

A task with more than one slice, or one that spans sessions, keeps `plan.md`,
`handoff.md` and `notes.md` in `work/tasks/<slug>/` (gitignored). Before the
last merge, move what's worth keeping into code comments or the PR. `work/`
and `outputs/` belong to one worktree and are deleted with it, so copy a plan
for a later slice, or a batch a report cites, to the home checkout before the
worktree goes (`CONTEXT.md`, Local only).

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

## Order recovery

- `node scripts/run-order-recovery.mjs` (#670) and
  `node scripts/run-refund-ordering.mjs` (#664) score every code-only script
  and rewrite its report in `reports/order-recovery/`; add `--check` to
  compare without writing. No model is called yet.
- Cost, lower is better: right 0, asking a person 1, wrong final state 3,
  wrong capture 10.
- Ten held-out #670 orders stay sealed outside the repository, with only their
  hashes committed, until they are revealed after the model's prompt is
  committed. Don't look for, open or summarise them, and don't write their
  text, labels or location into a file, a PR or agent memory.

## Choosing work

Ask: "Will this show up in the demo or in this week's post?" If not, skip it.
Each week's post explains one thing I couldn't explain before.
Spend two hours on the simplest fix before writing any doc about a problem.
Change this workflow only when the same failure happens twice.
