# B01 Stage 03 offline unblock proposal

Date: 2026-10-03. Decision: **PENDING HUMAN REVIEW**.
Scope: preservation transition and bounded error diagnostics only.
Provider operations authorized by this proposal: **zero**.

The starting checkout was clean on approved `b01/factory-diet` at
`81a0cdae838ebc4502f6675b195265a5b6857626`. Spec/Data were complete,
accepted and fresh. Build remained incomplete; Verify/Ship had not run.
Work is on `codex/b01-unblock-offline`. D-03 still governs provider/spend
conditions; D-06 supplies the Git preservation transition.

## Preservation transition

The preservation anchor is snapshot
`62787d1e832773a24fda569826d3adc2789a6585`, not the old uncommitted
`43d42d2` HEAD/index/status. `checkB01GitPreservation` uses
`changedSince(62787d1, paths)` and separately checks staged differences,
including a staged change hidden by restoring the working file. Both anchors
must be ancestors of the current HEAD.

Protected inputs must equal the snapshot: `factory/_shared/`,
`factory/01_spec/`, `factory/02_data/`, `factory/03_build/output/`,
`factory/TRANSITION.md`, `factory/A01_PRESERVATION_MANIFEST.json` and
`_archive/`. This check enumerates Git path changes without loading archive
contents. Every other path outside the exact approved/proposed sets also
fails closed. No path prefix permits arbitrary new changes.

Factory-diet changes are accepted only as the exact committed contents through
`81a0cda`. A later edit, deletion or staged discrepancy on one of those paths
does not inherit that approval. The exact approved path set is:

```text
.github/workflows/ci.yml
AGENTS.md
CONTEXT.md
db/case-investigator.mjs
factory/03_build/CONTEXT.md
factory/04_verify/CONTEXT.md
factory/05_ship/CONTEXT.md
factory/CONTEXT.md
factory/DECISIONS.md
factory/_lib/budgets.mjs
factory/_lib/budgets.test.mjs
factory/_lib/factory-state.mjs
factory/_lib/git-preservation.test.mjs
factory/_lib/review-locks.test.mjs
factory/_lib/scoreboard.test.mjs
factory/_lib/verify-kit.mjs
factory/_templates/REVIEW_BRIEF.md
factory/_templates/stage/CONTEXT.md
factory/scoreboard.mjs
factory/seal.mjs
factory/status.mjs
package.json
scripts/test-offline.mjs
tests/evaluator/grade-golden-case.mjs
tests/icm-workspace-legacy.test.mjs
tests/icm-workspace.test.mjs
tests/rendered-html-build.test.mjs
tests/rendered-html.test.mjs
```

The new offline changes are a distinct, explicitly pending set of nine paths,
listed below. Their current Git blob IDs are reported for review, never treated
as an execution grant. A commit does not change their pending approval state.

The three preflights replace only their product-repository inventory/HEAD/
index/status preservation comparisons. Their old packets, AUTHORIZED_CHANGES,
prior-current copies and reconciliation records stay immutable. Existing raw
bindings for ignored `outputs/` files remain checked; credentials are never
read. Original directory existence/type and saved junction targets remain
checked using metadata, without a file inventory scan. Retained execution-source,
consumed-claim, failed-Case, hash-chain and
read-only database checks in `checkExecutedBenchmark` remain intact.

The outer historical repository has no B01 snapshot commit. Its unrelated
legacy preservation checks remain in the preflights; this task neither edits
that repository nor claims that P's snapshot qualifies O's bytes. Full legacy
preflights are not run here because they traverse that historical repository
and frozen archive evidence. The changed product preservation code is tested
separately with temporary Git repositories.

Historical report bindings that differ are qualified only when their affected
paths are explicitly classified by this transition. The report retains the old
hash, the current hash, the exact affected paths and `reviewRequired: true`;
it does not rewrite a binding or claim freshness. All unqualified bindings
still require equality. The runner's seven historical reconciliation entries
retain their original hashes/copies and explicitly report qualified paths.

The candidate preflights return `status: review-required` and
`providerRequestsAuthorized: false`. They preserve evaluator-isolation,
provider selection, token, turn, tool, spend, authority and gate checks.
Old source-bound execution receipts reject the changed current transport.
No replacement receipt, execution claim or continuation entrypoint is created.

## Exact code changes

- `factory/_lib/b01-preservation.mjs`: the two immutable Git anchors, exact
  protected/approved/proposed classification, staged-difference checking,
  historical binding qualification and reuse of existing raw runtime bindings.
- `factory/03_build/gemini-preflight.mjs` and
  `factory/03_build/subscription-preflight.mjs`: use the product Git check,
  retain historical copies and unrelated checks, report qualified bindings and
  pending review. The subscription route is historical and remains unselected.
- `factory/03_build/runner-checks.mjs`: the same migration, explicit
  reconciliation qualification, and unchanged retained-execution checks.
  Current source hashes bind the new diagnostic and preservation modules and
  verify-kit; the old executed request still uses its immutable source snapshot.
- `db/benchmark/gemini-diagnostics.mjs`: harden the existing frozen
  `continuation-v1/diagnostics.mjs` and `repair-v1/diagnostic-next.mjs`
  ideas into current code. Those frozen modules are not edited or imported
  into the new implementation.
- `db/benchmark/gemini-http.mjs`: on non-2xx responses, read the bounded
  diagnostic under the existing abort/deadline, then retain the original
  `http_failure` stop. No request-body, schema, endpoint, model or limit changes.
- `factory/_lib/b01-preservation.test.mjs` and
  `tests/benchmark-gemini-diagnostics.test.mjs`: temporary Git/runtime fixtures,
  synthetic responses and injected transports only.
- `docs/b01-unblock-offline-proposal.md`: this review proposal and validation.

Diagnostics retain at most 8,192 incoming bytes transiently for parsing. The
returned record contains only a bounded numeric HTTP/code value, allowlisted
status, fixed protocol-field names, an unavailable reason and a fixed hint.
Schema descendants and prompt positions collapse to fixed field names; unknown
request keys cannot become output. Raw bodies, messages, descriptions,
prompt values, other credentials and evaluator canaries are discarded.
An echoed injected credential discards the whole diagnostic. Hints always
carry `classificationIsConfirmedCause: false`. Oversize, malformed, missing,
failed or stalled streams remain bounded and abortable. Failure stops the
transport and batch; automatic retries remain zero.
The existing lastFailure operation/status envelope remains exact; the new
sanitized record is exposed separately as lastFailureDiagnostic.

## Current documentation and compatibility

Only public official Google documentation was accessed, on 2026-10-03.
No model-metadata, token-count, smoke or generation API request was made.

The [Google REST reference](https://ai.google.dev/api/generate-content)
documents the pinned generateContent route, text content, thinking config,
responseFormat's JSON MIME enum/schema, and responseMimeType/responseJsonSchema.
The original responseFormat body cannot currently be labelled an undocumented
field cause; the frozen repair already used the latter pair. The legacy JSON
Schema keyword list omits maxLength; the separate Schema resource includes it.
responseSchema/_responseJsonSchema are deprecated in favour of responseFormat;
responseJsonSchema has an internal, self-referential description. These
interfaces do not establish interchangeable enforcement. The generation cap
describes candidate output, leaving inclusive reasoning-budget compatibility
for explicit review.

The [structured-output guide](https://ai.google.dev/gemini-api/docs/structured-output)
documents a schema subset, typed strings/enums, closed object properties,
numeric/array constraints and nullable types. It warns that large or deeply
nested schemas may be rejected. Its string-property list omits `maxLength`.
That omission is a compatibility concern, not proof that a particular retained
schema was rejected. The existing projection in `db/benchmark/gemini.mjs`
already moves `maxLength` to host-only validation; this commit does not extend
or silently approve that projection. Explicit enum typing in the frozen
continuation and its later Developer API mapping remain historical evidence.

The [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
lists the exact stable model, structured output and thinking support, and
larger model-level input/output ceilings than B01's stricter limits. It does
not establish account eligibility or request compatibility. The
[thinking guide](https://ai.google.dev/gemini-api/docs/thinking)
lists minimal thinking for this model. Minimal does not mean zero reasoning
tokens or prove a separate hard reasoning cap. No model substitution, thinking
change or numerical-budget relaxation is proposed here.

**Unknown:** the retained HTTP 400 response body was discarded. Its exact
parameter-level cause cannot be recovered offline. Schema complexity,
schema-keyword rejection, output-format route behaviour and thinking/output
configuration are hypotheses. A synthetic error that maps to one of those
hints supplies no evidence about the actual failed request. Public examples
and earlier successful metadata/token counting do not prove successful
generation or permitted billing.

## Required human review and any amendment

Proposed preservation qualification: approve the exact eventual commit of
this branch relative to snapshot `62787d1` and approved diet `81a0cda`, with
the nine paths above and all protected inputs unchanged. Record that decision
as a separately reviewed, commit-bound artifact. Do not update a frozen
baseline or infer approval from this proposal or the branch name.

Proposed compatibility qualification, **not applied**:
`b01-gemini-schema-enforcement-qualification-v1`. Review whether every frozen
string-length constraint can be enforced by the selected documented wire
schema. If any accepted constraint is unsupported, keep requests blocked
until a human-reviewed amendment explicitly defines its enforcement and
rebinds the necessary Spec/Data compatibility evidence through the governed
process. Host rejection after generation is not silently equivalent to
provider-side enforcement. Restoring documented wire constraints, or an exact
qualified host-enforcement amendment with unchanged numeric caps, must be
reviewed before selecting a new request. No accepted file is changed here.

If an inclusive reasoning/output limit cannot be established for this exact
route, that too requires an exact reviewed amendment; do not reinterpret it
as visible-output-only or assume missing thoughts/usage equal zero.

The preserved `repair-v1/PROVIDER_DIAGNOSTIC_PROPOSAL.md` contains a separate
pending one-request exception, `b01-one-scheduled-diagnostic-v1`, for unused
row `r_e3e4fbedbf71` and request hash
`70feefbd080338aa2b110552607ae1cc698a705158bbdf5642f63122f427e0f0`.
It remains pending. Its old diagnostic-source bindings do not approve this
new implementation. No exception or new execution authority is inferred.

## Conditions before another scored request

1. Human review binds this exact preservation/diagnostic revision and resolves
   any schema or inclusive-output contract amendment. Spec/Data must remain
   accepted and fresh under the resulting governed bindings.
2. The owner explicitly chooses either continued blocking or a separately
   scoped, exact unused scheduled request, including an explicit compatibility
   exception if server compatibility remains unknown. Review must identify
   the row/request hash, allowed operations and unchanged limits. An existing
   failed run or consumed claim may never be reused, replayed or replaced.
3. A future separately authorized continuation must be offline-tested and
   source-bound to the reviewed decision, frozen request, original identity and
   new additive store. Keep all failed/unrun records in the original denominator
   and preserve every old claim, Case, summary and source packet.
4. Before any future dispatch, verify the actual Free-tier project, billing
   disabled, sufficient quota and scoped host credential availability without
   exposing credentials. A caller flag or subscription badge is not proof.
   Metadata/count operations themselves require explicit authorization.
5. Use the exact complete-request and serialized-request token accounting:
   8,192 context including framing and output; 1,024 output including reasoning;
   6,144 cumulative generation; 12 turns, with one single-shot generation;
   10 attempted tools; 50 rows; 160 search characters; 180-second request;
   900-second investigation; concurrency one; retries zero; paid spend cap $0.
   Preserve restricted-worker/evaluator isolation and all authority checks.
6. Stop on failure, unknown/inconsistent usage, unsupported configuration,
   uncertain quota/billing or consumed claims. Unknown generation usage and
   charges remain unknown. Any single-attempt exception stops after that one
   attempt and returns to human review, regardless of outcome.

Offline completion grants no provider operation, gate acceptance, runtime
intervention or repair-budget change.

## Offline validation

- `npm run lint`: passed, exit 0.
- `npm test`: passed, 221/221 tests; zero failures, cancellations or skips.
  Ten new tests cover Git classification/protected drift, staged discrepancies,
  raw runtime hashes, directory/junction preservation, bounded diagnostics,
  redaction, deadlines, terminal transport behavior and a consumed synthetic
  Case claim. Existing budget/isolation/authority regression tests remain intact.
- `node factory/status.mjs --strict`: passed, exit 0. Spec/Data remain complete,
  accepted and fresh; Build remains incomplete/stale, Verify/Ship never run,
  and release unsealed. Strict success does not accept the Build gate.
- The actual product portions of all three saved preservation packets passed
  metadata and raw-runtime checks: 382/390/369 original directories,
  one existing junction each, and 477 unchanged raw runtime bindings each.
  The Git audit reports 28 exact approved paths and nine pending offline paths;
  all protected inputs remain unchanged. New current-source hash bindings pass.
- The retained `checkExecutedBenchmark()` read-only audit passed for the original
  source snapshot, consumed claim, failed Case, store hashes and timeline chain.
  No historical evidence or existing runtime store was written.
- Stage 03 contract: 334 words. Cold load: 1,921 upfront plus 402 referenced
  decision words = 2,323/2,500; all existing limits remain unchanged.

An initial diagnostic test exposed the existing exact lastFailure-envelope
contract; the implementation was corrected to expose diagnostics separately,
without weakening that assertion. A new directory-fixture test initially used
the file-removal API; its empty-directory removal was corrected. Final tests pass.

Validation used the existing Node/npm CLI because the roaming npm shim is
broken. Provider credentials were removed from validation processes without
reading their values. Test transports used synthetic keys/responses and
temporary stores. No build is required for preservation/diagnostic changes;
existing dist/.vinext are preserved. Full legacy stage preflights were not run
for the historical/archive traversal reason above. Benchmark execution
entrypoints were not invoked.
