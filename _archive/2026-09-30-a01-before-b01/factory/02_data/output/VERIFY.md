---
unit: a01-synthetic-revenue-investigation
stage: 02_data
status: passed
verified_at: 2026-09-26T17:30:38.802Z
scope: DATA_CONTRACT_ONLY
---

# A01 Data verification

Environment: Windows, Node v22.15.0, existing authoritative checkout at
C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1.
All runs are local and SIMULATED. No model or paid service was called.

## Commands and results

| Command | Exit | Observed result |
| --- | ---: | --- |
| node factory/01_spec/verify.mjs | 0 | Accepted Spec remains fresh; 12 criteria, 9 failure experiments, 16 input hashes and corruption probes pass |
| node factory/02_data/verify.mjs --check-data | 0 | Repeatability, data/query/proposal, isolation and temporary SQLite checks pass |
| git diff --name-only 58b2aa0 -- app db scripts tests supabase worker drizzle | 0 | Empty: existing product and regression surfaces unchanged from the sealed baseline |
| git diff --check | 0 | No whitespace errors |
| node factory/02_data/verify.mjs | 0 | Full contract checks, saved fixtures/results, all declared bindings and pending gate hashes pass |
| node factory/status.mjs | 0 | Spec complete/accepted/fresh; Data active with open gate and fresh dependencies; later stages never-run |

The full command, node factory/02_data/verify.mjs, repeats these contract checks
and validates the assembled record: 23 exact Data bindings, four verification
bindings, saved generated fixtures/results, and pending gate artifact hashes.
The assembled record passed before handoff. Verification opens the gate; it
never accepts it.

## Repeatability and reference branches

Two fresh authoring processes produced byte-identical output, SHA-256
1b921bcc39c4b8698f6110c1cd98340902c7d3eeb1115a49defa5d19a0ea1129.
Saved fixtures contain 20 complete, 13 limited, and 21 injection observations.
Private state generates 190/200 affected successes in each post-checkout-rollback
window and 120/200 after the unrelated rollback or no action. Control segments
remain 190/200. Expected values are read only by the verifier from evaluator truth.
See [contract-results.json](contract-results.json) for exact machine results and
[DATA_PACKAGE.md](DATA_PACKAGE.md) for event references and contract semantics.

## Deliberate failures and persistence

- Nineteen malformed observable, query and proposal inputs were rejected,
  covering foreign scope, LIVE, duplicate/future evidence, inconsistent totals,
  unknown fields/tools, paging context, excessive limits, manual-check action,
  missing citations, expiry and action caps.
- Eleven invalid storage operations were rejected, covering missing labels or
  action, foreign/mismatched grants, missing/duplicate effects and history mutation.
- A child process exited during an uncommitted transaction. Reopening retained
  zero effects, one initial world revision and no timeline event. Effect, new
  world checkpoint and timeline were rolled back together.
- After committing those records, reopening retained one effect, two world
  revisions and one timeline event. Tests use a disposable local database.
- Restricted fixed-runner probes denied four private reads (including alternate
  path), one write and child-process creation. No evaluator secret environment
  value was inherited. The denied content was never returned by the probe.

## Scope and limits

The executable DATA modules and their syntax/imports were exercised by the
stage verifier. Application build, application lint, hosted migration and full
product-suite runs are not applicable to these stage-only data artifacts; the
tracked product surfaces listed above have no change. This is not a new full
product regression claim. Node reports its SQLite experimental-feature warning.

The permission probe verifies the tested fixed Node process boundary; it does
not establish an OS sandbox against arbitrary native code. Product tool-host
isolation, budget enforcement, injection behavior, hypothesis updates, exact
human approval, integrated execution and hidden-truth behavioral grading remain
Build/Verify obligations. Reference transitions and surrogate storage grants
are not approved product effects. Model evaluation is NOT_RUN.

No TEST or LIVE data was modified. The excluded trial receipt, existing tenant
checks and Mobile Safari regression remain in the unchanged product surfaces.
These results establish neither actual Mobile Safari verification nor payment
capture or recovered business revenue. The historical factory is preserved in
the transition archive; the Data gate remains pending.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/02_data/CONTEXT.md` | `e42afae22dd29acc2601970afa0b2ea93d1a0e602195f9819e417b07bafca6f7` |
| `factory/02_data/verify.mjs` | `474d2ba52f542db02a309f8f41a302163937de352bbbf5ea98d9f55044b868d1` |
| `factory/02_data/output/DATA_PACKAGE.md` | `2a3c7d8c5668eee58992284edbe0d14774ea6057a4a3991031816a39ab638eae` |
| `factory/02_data/output/contract-results.json` | `c66ddec72fdb94879efb5195df0baa9b01e6ae4437cfd52a67623bff2bed98e5` |
