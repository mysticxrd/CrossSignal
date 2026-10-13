# CrossSignal

An AI incident investigator. It reads a store's signals (daily revenue, deploys, service health and support
messages), names the change behind a revenue drop and recommends an action that a person must approve. It never
takes the action itself.

**Live demo:** not deployed yet. The public replay is built for Cloudflare's free Workers plan
(`npm run deploy:replay`); its link goes here once it is up. Until then, [run it locally](#run-it-locally).

## What the demo shows

One recorded investigation, replayed read-only: every tool call the model made, what came back, its finding and
recommendation, and the grade a separate grader gave it against a frozen answer key. Nothing on the page calls a
model or changes anything, and the Approve button is disabled. Each replay is labelled with its run id, date and model.

The demo run is case B17, where a checkout deploy broke validation for mobile shoppers. The tool-using model queried
revenue twice and engineering once, blamed the deploy and recommended a rollback for a person to approve: 5/5. The
page links the other two recorded runs of the same case, including the one that scored 0/5.

## Results so far (W1)

`gemini-3.5-flash-lite` on the Gemini free tier with LOW thinking (profile `low`), commit `a37afcc`, run on
2026-10-06. Five cases built on a real store's daily traffic and sales; each incident was injected into those rows and
labelled before any run, and the deploys, health readings and support messages are synthetic. Three batches, each one
fresh run of every case with every method. A run scores one point per check passed: status, cause, change, segment
and rollback.

| Case | What happened | Single-shot model | Tool-using model | Rules |
|---|---|---|---|---|
| B16 | Traffic mix shifted away from desktop | 4/15 | 7/15 | 2/5 |
| B17 | A checkout deploy broke validation on mobile | 13/15 | 10/15 | 5/5 |
| B18 | The payment provider had an incident | 11/15 | 9/15 | 1/5 |
| B19 | No incident, only the ordinary weekly dip | 11/15 | 11/15 | 3/5 |
| B20 | Data arrived late; the right answer is "not enough evidence" | 0/15 | 2/15 | 5/5 |
| **All** | | **39/75 (52%)** | **39/75 (52%)** | **16/25 (64%)** |

Rules is the no-model baseline in `db/benchmark/daily-rules.mjs`. It scores the same in every batch, so it is shown
per batch; its rules were written for these incident families, so read it as a reference point, not a rival.

| Mean per run | Single-shot | Tool-using |
|---|---|---|
| Tokens (input + output) | 5,439 | 25,904 |
| Gemini requests | 3.1 | 17.6 |
| Wall time (free-tier spacing included) | 16.3 s | 84.5 s |

What it says so far:

- Letting the model call tools did not beat one well-packed prompt: both scored 39/75, and tool use cost about
  five times the tokens and time.
- Both models fail B20. Asked about a drop the data cannot explain, they name a cause anyway.
- The sample is small. Batch-to-batch swings (the tool-using model scored 5, 0 and 5 on B17) are as large as the
  gap between methods.

The full comparison, with per-check results, how runs ended and how each check is graded, is in
[reports/b01-w1/COMPARISON.md](reports/b01-w1/COMPARISON.md), written by `tests/evaluator/compare-b01.mjs`.

## How a replay is checked

There are two checks, one inside the recording and one outside it.

1. **Chain intact.** Each row's hash covers the row before it, as the recorder wrote them. This catches a careless
   edit but not a careful one: whoever edits a row can recompute every hash after it.
2. **Timestamped.** Each recording's sha256 is timestamped with [OpenTimestamps](https://opentimestamps.org), which
   commits it to a Bitcoin block (`db/replays/<runId>.json.ots`). The page hashes its own copy, and if the bytes no
   longer match the stamp it hides the finding and the grade. A rewritten recording would need a new stamp, and that
   stamp would carry a later date.

To check one yourself, download a recording from `db/replays/` with its `.ots` file and drop both on
opentimestamps.org. The timestamp proves the file has not changed since it was stamped. It cannot prove what
happened before then (the W1 runs were recorded on 2026-10-06 and stamped on 2026-10-13), or that the replies came
from Gemini, because Google does not sign them.

## Run it locally

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000/runs/r_c72728d0a839`. Other commands:

| Command | What it does |
|---|---|
| `npm test`, `npm run lint` | Offline test suites and lint |
| `node scripts/run-b01.mjs --profile low` | Runs the benchmark. Needs a free-tier `GEMINI_API_KEY`; the runner refuses to send unless the account attestation says billing is off with no paid fallback |
| `node scripts/export-replay.mjs --batch <batch> --case B17 --method tool-using-model` | Copies a graded run into `db/replays/` |
| `node scripts/stamp-replays.mjs [--upgrade]` | Timestamps new recordings; `--upgrade` adds the Bitcoin block once the calendars have committed |
| `npm run deploy:replay` | Publishes the read-only replay to Cloudflare's free Workers plan |

## Layout

| Path | What it holds |
|---|---|
| `app/runs/[runId]/` | The public replay page |
| `db/replays/` | Committed recordings, their timestamp proofs and `stamps.json` |
| `db/benchmark/` | Gemini request, transport, budget and schemas |
| `tests/evaluator/` | Grader, rubrics and the batch comparison |
| `worker/` | The Cloudflare Worker, including the read-only gate |
| `reports/` | Committed results |

## History

Until October 2026 this repository was built through a staged spec → data → build → verify → ship "factory", which
shipped an onboarding-rescue approval demo and a local replay of the A01 investigation mechanics. The factory is
frozen at tag `factory-freeze-2026-10-03`. Its evidence stays in `factory/` and `_archive/`, and
[CONTEXT.md](CONTEXT.md) is the way in. [AGENTS.md](AGENTS.md) describes how agents work here now.
