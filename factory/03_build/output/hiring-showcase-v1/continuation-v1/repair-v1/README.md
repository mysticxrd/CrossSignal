# CrossSignal — current Stage 03 review

CrossSignal turns a synthetic revenue drop into a durable, inspectable Case.
The investigator can retrieve scoped evidence, compare explanations, cite
support and contradictions, then recommend a next step or abstain. The host
owns credentials, limits, persistence and authority.

**Current result: the Gemini happy path is blocked.** The approved 15-record
study has one saved tool-using failure and 14 NOT_RUN investigations. No Gemini
finding, model revision or generation usage was returned. This is failure
handling evidence, not an accuracy result or a finished hiring showcase.

Start with [the saved Case viewer](index.html), the
[three-minute walkthrough](DEMO_WALKTHROUGH.md),
[evaluation and failure report](EVALUATION_REPORT.md), and
[architecture/interview guide](ARCHITECTURE.md). The viewer is static and has
no script, remote asset, model request or writable runtime route.

From the authoritative product checkout, reload without inference:

```powershell
node factory/03_build/output/hiring-showcase-v1/continuation-v1/repair-v1/review.mjs --reload
```

The reload checks the frozen sources, manifest, scoped evidence, terminal
result, database hash and ordered append-only timeline. Saved source files and
records are bound in [SAVED_INSPECTION.json](SAVED_INSPECTION.json).

## What this continuation adds

- The accepted preservation qualification, keeping the original failed
  raw-index assertion and all older manifests. Future checks bind the unchanged
  current index, logical index/HEAD equality and every original file hash.
- A source-bound 15-record runner with fresh restricted contexts, exact request
  counting, durable recording, original limits and no automatic retries.
- An additive Developer API wire adapter using responseMimeType and
  responseJsonSchema. Local validation passes; actual generation still rejects
  it. This is not recorded as a successful HTTP repair.
- Offline fixtures that exercise all 15 methods/cases and durable tool
  transcripts, plus saved-record reload and bounded error-diagnostic tests.
  Fixtures are not scored model results.
- One real, authorized Free-tier benchmark attempt, preserved with HTTP 400.
  No standalone smoke request, manual chat, paid fallback or runtime effect.

Selected model: gemini-3.5-flash-lite. Current official support and Free Standard
pricing are linked in [PROVIDER_CONTRACT.md](PROVIDER_CONTRACT.md); the owner
confirmed billing disabled and adequate quota. Metadata and all ten scheduled
initial token-count checks passed. Provider generation compatibility remains
unverified after the rejection; further requests are blocked.

Original limits remain: 8192 complete working-context tokens; 1024 output
including reasoning; 6144 accumulated generation; 12 turns, one single-shot;
10 attempted tools; 50 rows per result; 160 search characters; 180-second
requests; 900-second investigations; concurrency one; retries zero.

## Exact next review

[PROVIDER_DIAGNOSTIC_PROPOSAL.md](PROVIDER_DIAGNOSTIC_PROPOSAL.md) proposes one
remaining scheduled single-shot investigation with bounded error-category
recording while server compatibility is unresolved. It changes only that
request prerequisite; all numeric limits, model, isolation, Free-only boundary,
schema and 15-record denominator remain intact. It is pending human review,
not executable authority. It does not recover the discarded messages from
either older HTTP 400, retry the failed Case, or accept Build.

Scope and preservation qualification are accepted. Stage 03 Build remains
incomplete/pending; Verify and Ship have not run; larger B01, repeated study,
improvement experiment and intervention demonstration remain incomplete.
The checkout stays uncommitted and unsealed. Historical entry documents remain
unchanged; this child packet is the additive current entry.
