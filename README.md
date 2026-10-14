# CrossSignal

An AI incident investigator. It reads a store's signals (daily revenue, deploys, service health and support
messages), names the change behind a revenue drop and recommends an action that a person must approve. It never
takes the action itself.

**Live demo:** [crosssignal.hishamxrd.workers.dev](https://crosssignal.hishamxrd.workers.dev), a read-only replay
on Cloudflare's free Workers plan (`npm run deploy:replay`). You can also [run it locally](#run-it-locally).

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
[factory/CONTEXT.md](factory/CONTEXT.md) is the way in. [AGENTS.md](AGENTS.md) describes how agents work here now,
and [CONTEXT.md](CONTEXT.md) maps the folders.

## Type checking

Run `npm run typecheck` to check all three runtimes: the Cloudflare web app, the local Case lab, and the Supabase Edge Function. No application code or model calls run during these checks.

- `npm run typecheck:web` first generates Cloudflare runtime declarations with Wrangler, then runs TypeScript. `wrangler.jsonc` pins the compatibility date already used by the Vite build; resource bindings remain in `vite.config.ts`. Regenerate the ignored `worker-configuration.d.ts` with `npm run cf:typegen` after configuration changes or a clean checkout.
- `npm run case:typecheck` checks the local browser app using its own browser and Node types.
- `npm run typecheck:functions` checks the Edge Function using the pinned Deno development dependency and `supabase/functions/deno.lock`. The first run downloads public type dependencies; it does not invoke the function or connect to a database. Deno-only sources are excluded from the web TypeScript project and checked here instead.

References: [Cloudflare runtime types](https://developers.cloudflare.com/workers/languages/typescript/), [Supabase development environment](https://supabase.com/docs/guides/functions/development-environment).

## Local SaaS Case lab

Run `npm run case:lab`, then open **http://127.0.0.1:4317**. This is a separate local Node/React app; the public replay worker is unchanged.

The journey is: observed conversion signal -> immutable evidence packet -> Gemini investigation -> trusted proposal eligibility -> **Approve and run this simulation** -> observed outcome -> owner closure. All company data and effects are **SIMULATED**. A real Gemini response is not evidence of real business impact.

- Choose a synthetic situation and open a Case. Source records show unique purchase intents, successful first payments, subscription activations, maturity and coverage.
- Investigate to run the existing isolated Gemini runner with a SaaS evidence packet. Only `gemini-3.5-flash-lite`, the `low` profile and the existing $0 account attestation are supported. `GEMINI_API_KEY` stays in the host's environment or ignored `.env`.
- Review citations, competing explanations and eligibility reasons. Missing health evidence cannot produce an executable proposal even when the model recommends one.
- Exact approval records a grant and pending job together. Execution rechecks scope, versions, evidence, plan, expiry and pause, then commits the simulated transition and receipt together. Double clicks and restarts do not repeat it.
- Choose **Advance simulation and observe** to produce subsequent observations. Reloading never advances time. A receipt alone does not satisfy the outcome criterion.
- Close with recovery observed, close unresolved with a reason, or continue investigating. Late data retains the original measurement interval; a separately labelled later regression can reopen the Case.
- An expired or deferred proposal can be rechecked/refreshed from its existing finding without spending another model attempt. The refreshed proposal requires its own exact approval.

Synthetic parameters are versioned in `db/cases/measurement.mjs`: two 15-minute windows, at least 80 intents per cohort/window, 10 minutes to complete and 5 minutes for arrival. The sample incident is 80% -> 40%, with a stable assisted cohort. The follow-up target is baseline minus 5 percentage points in **both** windows, with stable controls. These are demonstration defaults, not a validated real-world detection policy.

Durable state lives in ignored `outputs/case-lab/cases.sqlite`; immutable per-attempt recordings are under `outputs/case-lab/recordings/`. Do not delete these to reset the attempt budget. The initial development allowance is **two attempts total**, failures included, persisted across restarts. Additional calls require an explicit owner budget decision. `node scripts/case-smoke.mjs` requests only the two named smoke Cases and reuses their existing records on rerun; it never approves an action.

Validation: `npm test`, `npm run lint`, `npm run case:typecheck`, `npm run case:build`. After that build, `node tests/helpers/case-browser.mjs` starts a separate offline browser harness at port 4318, with generated test answers and approvals labelled `fixture_surrogate`; it makes no model calls. The actual owner approval remains separate from those tests.

The local service binds only `127.0.0.1`, uses a same-origin request token, and rejects foreign Host/Origin requests. This first slice is for one trusted local owner; it is not a hosted multi-user authentication system. Adaptive tools, live company connectors, public deployment and model-quality claims remain outside this slice.
