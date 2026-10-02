---
type: data-stage-implementation-contract
version: benchmark-store-design-v1
status: proposed-for-build-after-data-acceptance
---

# Separate benchmark view and recording boundary

The frozen incident-data-v2 fixtures live only in this Data stage. No A01 fixture,
database, migration, runtime module, approval or history is changed. Build should
implement a small separate benchmark view/store, not pass v2 rows into CaseStore.
The observed A01 store fixes INR price 50000, initial private world/windows and
rollback-only intent/effect relations. New pricing/coverage rows cannot satisfy
that contract; replacing its validator would invalidate existing A01 runs.

## Pure version adapter

`contracts.mjs` validates v2. `bindRun` rebinds a frozen observable fixture to
host-created opaque workspace/case/run/actor identities and rehashes each event.
Stable evidence IDs and observable facts stay unchanged across methods and
replicates. The host records the private dataset origin and hashes outside model
exposure. Models cannot supply identities or credentials in tool arguments.
Existing A01 v1 stays on its original validator/store and original identities.

The original A01 segment-conversion detector remains unchanged. The v2 host
signal compares observed aggregate revenue, attempts, successes and visits;
it explicitly reports incomplete received-window coverage. It never labels a
hidden cause. The three domain meanings remain revenue.inspect (including
coverage), engineering.inspect (including typed pricing changes) and literal
support.search. All rows are pre-cutoff, tenant/case/run-bound and paginated.

## Minimal new recording schema

Proposed path: outputs/b01/<opaque-case>/<opaque-run>/case.sqlite, created only
by accepted Build work. No such database is created during Data. Use new tables
or a new standalone database, never migrate/rewrite old runs:

| Table | Minimum immutable content |
| --- | --- |
| benchmark_runs | workspace/case/run composite key; SIMULATED; data, schema, rubric, prompt, code and config hashes; method/replicate and private dataset origin |
| benchmark_evidence | scoped stable ID; validated v2 JSON and content hash; no private world, rubric or expected labels |
| benchmark_timeline | scoped sequence/event ID; visible query/result/denial/finding/terminal record; previous and current hash; logical and wall time; sanitized exposure references |
| benchmark_transcripts | append-only sanitized request/response, usage/error, exposure/request/result hashes; no auth headers, private labels or hidden reasoning text |
| benchmark_findings | raw visible answer; typed parse or explicit parse failure; terminal status; no silent semantic repair |

Adopt existing recorder invariants: strict scoped foreign keys, monotonically
appended sequence, canonical hashes, atomic transactions, append-only update/
delete rejection, reopen validation and invalid-attempt budget persistence.
Do not claim durability from the in-memory Data createSession prototype; Build
must implement and test it. Share hash/recording/authority primitives where they
are generic; do not inherit A01's world-construction assumptions or broaden its
intent/effect allowlists. Evaluator grades after transcript close in a separate
process. Its feedback never returns to the running investigation.

## Authority and API boundary

Automatic comparisons stop at findings/read-only next steps. The benchmark
store has no approval/execution endpoint or simulator mutation capability.
The later separate fresh B01/A01 human demonstration uses the existing v1
simulator and exact-authority validator, with its own immutable intent,
actor/scope/context/policy/payload hashes, nonce, expiry, Global Pause and one-time
grant/effect checks. Link it to the comparison as a separate demonstration.
If an operator authors a proposal, record that provenance. Generic stage
acceptance, findings and fixture grants are never local-human runtime approval.

The API transport alone can obtain credentials and use a fixed reviewed endpoint.
The restricted worker has exactly three allowed files and no credentials, write
or child-process permission. Node 22's permission model is not claimed to be a
general network or same-user OS security boundary. Fixed dispatch and argument
validation expose no network/file/effect tools. Build must validate its actual
transport/tool deployment, not treat these offline Data probes as API proof.

## Exposure and context

Only task.md, frozen common definitions/finding schema/tool schemas, initial
signal and compact eager/query rows may enter model requests. Compact rows
round-trip every public event field; redundant scope/version/truth fields are
supplied by the validated envelope. Ordered records bind each request/result
and stable exposed IDs. Reject unknown surfaces and scan every request/result
for evaluator canaries. Generators, private world/rubric/manifest, Spec, historical
reports, stored databases and this design are never model inputs.

The offline ASCII byte upper bound leaves 1024 output tokens and 256 framing
units within 8192 for full single-shot and initial tool packets. It assumes a
byte-fallback tokenizer; no provider is selected or measured. Build must check
the pinned provider's real tokenizer/framing and every accumulated context
before dispatch. Stop visibly on overflow; do not silently omit decisive rows
or add repair calls. Freeze provider/configuration, rules and experiment schedule
before scoring. Data acceptance grants no API spend or runtime intervention.
