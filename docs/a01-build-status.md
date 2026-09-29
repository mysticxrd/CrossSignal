# A01 — Build checkpoint

Updated 2026-09-26. The user accepted the exact Spec and Data artifacts.
Stage 03 now provides a local Case lifecycle and is pending human review.

## Review

- [Build evidence](../factory/03_build/output/BUILD_EVIDENCE.md)
- [Verification record](../factory/03_build/output/VERIFY.md)
- [Readable independently graded checkout report](../factory/03_build/output/replay/checkout.md)
- [Unapproved human preview](../factory/03_build/output/preview/preview.md)

The deterministic baseline queries evidence, records three competing causes,
seeks provider evidence that could falsify the leading explanation, and either
proposes a bounded rollback or abstains. The operator approves an exact payload
hash. A local SQLite transaction reserves the effect and changes private world
state together. Fresh windows determine resolution; later regression appends
reopening without erasing the prior result. The saved timeline survives restart.

## Run locally

From the existing `work/crosssignal-phase1` checkout, using Node 22.15.0:

```powershell
node --experimental-strip-types scripts/run-a01.mjs
```

This single command creates a fresh output directory, runs each of five
comparisons twice in fresh processes/stores, then invokes the hidden grader
separately. Reports and artifacts are under the printed `outputs/a01/replay-*`
directory. Previous runs are preserved. No packages, models or network services
are needed for this replay. Node prints experimental SQLite/type-stripping
warnings on this installed runtime.

For an operator-controlled preview:

```powershell
node --experimental-strip-types scripts/a01-case.mjs prepare
```

Open its printed preview. It includes the complete proposal and exact approval
command. Preparation creates no grant or effect. `inspect <directory>` reloads
the Case. `pause <directory>` and `unpause <directory>` control this local
simulator; `resume <directory>` recovers an already approved run. Missing or
malformed pause state fails closed. Existing app/LIVE controls remain unchanged.

## Observed checks

- 14 integrated tests passed, plus 19 existing regression tests.
- Five comparisons reproduced byte-identical artifacts across fresh processes:
  correct rollback, ineffective rollback, no action, limited evidence, and
  injected support text.
- Checkout rollback restores 190/200 affected successes per new window;
  unrelated/no rollback leaves 120/200. Limited evidence abstains.
- Exact authority, duplicate prevention, crash rollback, durable reload,
  tenant/time bounds, data ordering, later reopening and rehashed artifact
  tampering were checked.
- The actual restricted runner denied six private reads, writes and child
  processes; a synthetic evaluator environment sentinel was not inherited.
- Lint and the existing application build passed using the repository's
  preexisting parent dependency installation.

## Limits and next gate

All outcomes are **SIMULATED**. Automated grants are **fixture_surrogate**.
The prepared preview has **no human runtime approval**. Model evaluation is
**NOT_RUN**: no suitable runtime was found on PATH or in the checked default
Ollama manifest location. No model was downloaded or called. This establishes
deterministic mechanics, not AI investigation quality or the full hiring proof.

Node permissions protect the tested fixed investigator/tool code and exact file
allowlist; they are not an OS sandbox for arbitrary native code. The CLI actor
is the trusted local operator, not a remote authenticated identity. Artifact
hashes establish consistency, not signatures against an owner rewriting all
files. The independent rubric checks structured claims and cited evidence;
free-form model reasoning quality remains unevaluated.

The old Mobile Safari regression, manual-check approval semantics, excluded
trial receipt, hosted data and LIVE are preserved. No actual Mobile Safari
device verification, payment capture, or business revenue recovery is claimed.

The next decision is acceptance or changes to Stage 03 Build. AGENTS.md requires
that human gate before Stage 04 Verify. These changes remain uncommitted.
