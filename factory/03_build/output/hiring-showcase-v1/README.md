# CrossSignal — an inspectable revenue investigation

CrossSignal connects a synthetic revenue signal to permitted evidence, competing
explanations and a saved Case. The hiring showcase aims to demonstrate practical
agent integration, bounded tools, persistence and candid failure analysis for
a Result.dev engineering conversation.

**Current state:** offline preparation. One earlier rules Case and one failed
Gemini request are inspectable. Gemini generation returned HTTP 400; no valid
model finding is available. The proposed five-case, three-method, 15-record
study is NOT_RUN and awaits exact scope-amendment acceptance. Larger B01 stays
incomplete. All displayed observations and outcomes are SIMULATED.

## Inspect the work in three minutes

1. Open [the saved-Case viewer](index.html). Inspect the cited observations,
   missing counterevidence, recommendation boundary and retained provider failure.
2. Follow [the three-minute walkthrough](DEMO_WALKTHROUGH.md), then read the
   [architecture](ARCHITECTURE.md) and [evaluation report](EVALUATION_REPORT.md).
3. Open [the source and interview guide](INTERVIEW_GUIDE.md) to discuss the
   decisions, tradeoffs and remaining gap without treating tests as AI accuracy.

From the authoritative product checkout, reload the same saved data without
a model call, database write or runtime action:

```powershell
node factory/03_build/output/hiring-showcase-v1/prepare.mjs --replay
node --test factory/03_build/output/hiring-showcase-v1/tests.mjs
node factory/03_build/output/hiring-showcase-v1/verify-preparation.mjs
node factory/status.mjs
```

The local viewer requires no server, sign-in, installation or network. Its Case
layout follows the existing product's evidence/record presentation. It is an
offline projection of benchmark SQLite stores; integration into the authenticated
Cases route is still future work. The existing runtime UI and approval components
are preserved. Reload validates the original manifest, observations and hash
chain; it does not repeat inference or a potentially indeterminate dispatch.

## What to assess

- One host controls scope, credentials, admission and durable recording.
- The investigator uses fresh synthetic contexts and three typed read-only
  tools. It cannot read evaluator truth/rubric, old answers or development chat.
- Host enforcement of the original context, reasoning/output, cumulative token,
  tool/turn/time and no-retry/concurrency limits passes offline tests. Actual
  provider compatibility remains blocked; see [the compatibility review](PROVIDER_COMPATIBILITY.md).
- Findings expose citations and uncertainty; failures stay visible and saved.
  The current rules Case records one explanation and no counterevidence, a gap
  shown honestly rather than replaced with a fabricated Gemini answer.

The small evaluation is proposed as 15 fresh investigations, not 15 HTTP
requests or a broad accuracy study. Repeats, the measured improvement experiment
and runtime intervention demo are deferred from the initial showcase. Existing
authority/Pause/history safeguards remain; recommendations perform no action.

Review [the exact amendment](CONTRACT_CHANGE_PROPOSAL.md) and
[pending decision](HUMAN_GATE.md). Scope acceptance alone does not unblock
generation, accept Stage 03 or advance the factory. Resolve the retained HTTP
400 and preservation review, then reverify account/quota, compatibility and all
limits before any already-authorized Free-tier benchmark request. No smoke
generation, paid fallback, deployment or intervention.

Result's [public product](https://result.dev/) brings business analytics, AI
and shared company context into one workspace. This workflow's relevance to
that product is an inference; the team's current hiring rubric is unverified.
