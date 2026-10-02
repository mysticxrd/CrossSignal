# CrossSignal task router

One job: route work in the authoritative checkout
`C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1`.
The parent repository is historical. Preserve existing work; check Git status/HEAD
and run `node factory/status.mjs` before continuing.

## Routes

| Work | Read | Mode |
|---|---|---|
| Feature, schema, security, authority, external effect or public behavior | `factory/CONTEXT.md`, then the derived active stage | Governed ICM/MWP |
| Factory tooling, incident or cross-cutting refactor | Affected code and nearest tests | Direct engineering; back-port recurring lessons |
| Tiny single-file correction without schema, security, authority or public-contract effect | Target and nearest test | Express lane: edit, targeted test, stop |
| Product or architecture question | `docs/api-benchmark-charter.md`, `docs/benchmark-planning-reconciliation.md`, `factory/_shared/BENCHMARK_DIRECTION.md` | Read-only |
| Status | `node factory/status.mjs` | Derived, never stored |
| Historical comparison | Exact explicitly requested historical paths | Read-only |

## Loading rule

For governed work, read only the active contract, its declared inputs and named
shared references. Do not load later stages, `_archive/`, generated directories,
dependencies or the whole source vault.

Execution decisions and conditions: see D-01–D-05 in `factory/DECISIONS.md`.
Historical direction, reconciliation and preservation evidence:
`CONTEXT.md@62787d1:18-52`; `factory/TRANSITION.md@62787d1:1-48`.

## Ownership

Accepted outputs, gates and hash-bound freshness inputs remain immutable.
Propose source/binding corrections through review; never regenerate accepted
artifacts to hide drift. Durable product code owns runtime persistence,
concurrency, authorization and effects. Stage outputs are human-editable
handoffs; stop for the person's gate. Stage acceptance never grants runtime
intervention authority. See D-05 for the preserved intervention conditions.
