# Protected outer router correction — exact proposal only

Updated 2026-10-02; target:
`C:/Users/hisha/ChatGPT/CrossSignal/CONTEXT.md`.

The target contains pre-existing user work. The accepted
[B01 Spec verifier](../../work/crosssignal-phase1/factory/01_spec/verify.mjs)
asserts its raw SHA-256
`26016ff186b3548883cf246131a26afa0dfcb828b4336aeefc98a8e99d13db7c`
and reports `unrelated outer work changed` if it drifts.
The file and verifier remain unchanged.

The governing [shared provenance rule](../../work/crosssignal-phase1/factory/_shared/QUALITY_GATES.md#context-and-provenance)
states: “A recurring correction changes the source contract or stable reference after
human approval; it is not patched repeatedly in downstream output.”
The [factory rule](../../work/crosssignal-phase1/factory/CONTEXT.md) states:
“Never bypass an unaccepted stage or regenerate accepted artifacts to hide drift.”
Together with the explicit hash assertion and this cleanup's preservation limit,
these require presenting the correction for source/binding review.

## Exact replacement text for review

Replace the complete outer CONTEXT with the text below only after that review.
It corrects both the introductory hiring/pending-A01 wording and the route
table's old local-factory paths. It uses derived state rather than freezing
another stage table. The original raw bytes/hash must remain in reviewed
provenance; archive/copy disposition would itself need an exact reviewed scope.

```markdown
# CrossSignal workspace - task router

One job: route work to the authoritative checkout without loading history.

## Canonical execution checkout

The project root is C:/Users/hisha/ChatGPT/CrossSignal.
The active product is the separate Git repository at
C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1 (P).
This outer repository retains historical source, factory and planning evidence.
Its gates do not accept P's current milestone.

Read P's README.md and CONTEXT.md. Verify P's Git status and HEAD, then run
node factory/status.mjs from P before every resume. The status command derives
the active stage and release freshness. A01 remains the sealed historical
baseline at 43d42d255bd22cb227e3410dda31ffb8437f6624; B01 is the active run.
Preserve both repositories and all existing work.

## Routes

All current paths below are relative to P.

| Work | Read | Operating mode |
| --- | --- | --- |
| Governed product change | factory/CONTEXT.md, derived status, then only the active stage contract and its declared inputs/shared references | Full ICM/MWP pass; stop at the human gate |
| Current direction or architecture | docs/api-benchmark-charter.md, docs/benchmark-planning-reconciliation.md, and the active stage's subsequent decisions | Read-only answer or source/binding proposal |
| Tiny correction | Target file and nearest relevant check | Express lane |
| Incident or broad refactor | Affected source/tests only | Direct engineering workflow |
| Workspace clarity or disposition | ../../planning/2026-10-01-workspace-cleanup/MANIFEST.md | Scoped development review; physical dispositions need exact review |
| Historical audit | Exact requested archive/index paths | Historical context only |

## Loading and ownership

AGENTS.md gives identity and stable operating rules. CONTEXT.md routes work.
The derived active stage's CONTEXT.md defines its transformation; its declared
inputs and named shared references define the context packet; outputs are the
review surface. Do not load later stages, every archive/package/result tree,
dependencies or an entire source vault by default.

P's factory authors and verifies deliverables. P's application/database owns
runtime persistence, authorization, concurrency and effects. Hidden evaluator
truth is inaccessible to product investigators. Outer planning candidates and
historical factories are not alternate state machines.

Accepted inputs, gates and evidence retain their hashes and dated claims.
A source correction needs its declared review/provenance path; never change a
verifier to hide drift. Stage acceptance and exact runtime approval are separate.
No transition, operation or physical disposition follows from reading this file.
```

## Exact review decisions

1. Accept, revise or reject these replacement bytes for the protected outer
   source; preserve the original bytes/hash and unrelated user work.
2. Determine the legitimate new provenance/assertion handling with fresh
   evidence under the governing review path. This is not permission to
   silently substitute the verifier's expected hash.
3. Keep Spec/Data gates, A01 archive, shared references and all history intact.
   No stage acceptance, compatibility acceptance, runtime authority, commit
   or seal is included.

The accepted planning inputs
`docs/benchmark-planning-reconciliation.md`,
`docs/api-execution-boundary.md` and `factory/_shared/BENCHMARK_DIRECTION.md`
also retain dated preparation-state prose. No replacement is proposed for them
in this pass: mutable P README/CONTEXT and the existing current Build contract
already supply the chronological reconciliation. If a future factory needs
new source wording, it must use its reviewed contract/provenance path.

Current routing works through the corrected outer README and P's router while
this proposal remains pending. The [manifest](MANIFEST.md#planning-reconciliation)
records October 2 status and all other exact disposition decisions.
