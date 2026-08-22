---
id: phase-02
status: planned
depends_on: [phase-00]
unlocks: [phase-03]
prd_requirements: [FR-01, FR-02, FR-03, FR-04, FR-06, FR-06A, FR-15]
evals: [EV-01, EV-02, EV-05, EV-06]
---

# Phase 02 — Fixture data and deterministic scan provenance

## Outcome

Replace the scan animation and hardcoded observations with provider-neutral,
versioned fixture adapters and a durable rule-by-rule scan receipt.

Evaluator-visible proof: the same source snapshot deterministically evaluates
five rules, explains every pass/fail result, and stamps exactly one candidate
case without asking a model to discover the signal.

## Baseline

Evidence seeds are stored directly in `db/cases.ts`. The UI waits on a client
timer and resets the seeded case. No scan run, fixture manifest, adapter,
watermark, policy version, rule result, import validator, or dedupe receipt
exists.

## Entry criteria

- [ ] Phase 00 exit gate is complete.
- [ ] Golden case, date model, metric vocabulary, and truth labels are frozen.
- [ ] Provider-neutral boundaries may be developed independently of Phase 01.

## In scope

- PostHog-like analytics, Stripe-test-like revenue, GitHub-like repository, and
  synthetic support adapters.
- Versioned fixture packs, support CSV/JSON import, workspace metric setup,
  immutable observations, scan runs, rules, dedupe, and scan UI.
- Aggregate-only identity fallback for the golden case.

## Out of scope

- Live provider authentication or credentials.
- Model-driven ingestion, metric arithmetic, or anomaly detection.
- Nightly schedules and user-configurable rules.
- Person-level cross-source joins without a separately accepted identity link.

## Architecture invariants

- Provider SDK/data shapes stop at adapter boundaries.
- Detectors operate on normalized, immutable observations.
- Every query is bounded by workspace, source object, time window, and limit.
- Rule arithmetic is deterministic and versioned; EVE never decides whether a
  signal threshold matched.
- Source corrections create new observations or attributed annotations, never
  silent updates.

## Milestones

### P02-M1 — Define source ports and normalized contracts

**Deliverables**

- Narrow analytics, revenue, repository, and support interfaces; normalized
  observation/query/result types; contract-test harness.

**Work**

- [ ] Define exact bounded query inputs, pagination/limit, freshness, and error
      semantics for each source.
- [ ] Return sample size, units/currency, formula, window, and source references.
- [ ] Keep workspace identity injected by the server rather than an adapter call
      argument controlled by a model.
- [ ] Classify source text as untrusted data.
- [ ] Provide health/freshness from actual adapter execution records.

**Acceptance evidence**

- A second adapter can satisfy the contract without changing detector or EVE
  tool types.

### P02-M2 — Build versioned fixture packs and feedback import

**Deliverables**

- Golden, contradiction, missing-source, stale-window, low-sample, injection,
  and outcome fixture manifests with hashes.
- Redacted CSV/JSON support importer with row-level validation errors.

**Work**

- [ ] Store stable fixture IDs, versions, timestamps, source object IDs, and
      expected normalized hashes.
- [ ] Include planted PII/secrets and prompt-injection strings for later safety
      evals without exposing them outside the restricted fixture source.
- [ ] Validate file shape, encoding, maximum rows/field lengths, and taxonomy.
- [ ] Redact direct identifiers before observations enter model-visible surfaces.
- [ ] Reject invalid rows without silently discarding the rest of the report.

**Acceptance evidence**

- Reimporting the same fixture version yields byte-stable normalized results.
- Invalid rows identify row, field, and corrective action.

### P02-M3 — Complete workspace and metric configuration

**Deliverables**

- Durable company identity, timezone, primary segment, activation/conversion
  events, and immutable versioned north-star metric definition.

**Work**

- [ ] Persist numerator, denominator/exposure, aggregation, filters, grain,
      minimum sample, effect tolerance, and timezone.
- [ ] Preview the metric against a known fixture window.
- [ ] Version any material edit instead of mutating the definition used by a case.
- [ ] Reauthorize every setup and preview path.

**Acceptance evidence**

- The golden fixture preview reconciles to its declared expected values.
- A case retains the metric version it used after a later workspace edit.

### P02-M4 — Persist immutable source snapshots and watermarks

**Deliverables**

- Source snapshot/observation records, adapter/fixture version, content hash,
  watermark, ingestion time, observed window, identity scope, and annotations.

**Work**

- [ ] Dedupe by workspace/source/stable record or canonical content hash.
- [ ] Preserve source/query parameters sufficient to reproduce the observation.
- [ ] Add correction annotations as separately attributed records.
- [ ] Enforce aggregate-only output when no accepted person-level identity link
      exists.
- [ ] Index only demonstrated query predicates and run `PRAGMA optimize`.

**Acceptance evidence**

- Duplicate ingestion creates no duplicate observation.
- Updating an existing observation is rejected; annotation succeeds separately.

### P02-M5 — Add durable scan runs and rule evaluations

**Deliverables**

- `scan_runs`, source-watermark links, rule evaluations, matched signals, policy
  version, exact parameters, budget, status, error, and receipt records.

**Work**

- [ ] Define lifecycle `prepared -> running -> succeeded | failed | cancelled`.
- [ ] Persist start/end times, initiating actor, workspace timezone, source set,
      rule versions, and fixture versions.
- [ ] Record pass/fail, threshold, actual value, sample, window, and reason for
      every evaluated rule.
- [ ] Use an idempotency key for workspace/policy/source-window invocation.
- [ ] Preserve partial rule results and safe retry behavior after interruption.

**Acceptance evidence**

- Refresh shows the same persisted scan status and rule receipt.
- Retrying a completed idempotency key reuses the result.

### P02-M6 — Implement the five deterministic signal rules

**Deliverables**

- Versioned activation, conversion, revenue, support-theme, and release-correlation
  rule implementations with golden expectations.

**Work**

- [ ] Encode exact windows, comparison logic, thresholds, and minimum evidence.
- [ ] Treat incomplete sources or incompatible windows as explicit non-match or
      blocked evaluation, never fabricated values.
- [ ] Keep rule execution free of model calls.
- [ ] Record evidence IDs used by each result.
- [ ] Add ruleset version to every scan receipt and case signal.

**Acceptance evidence**

- Golden fixtures yield expected matches; missing/stale/low-sample fixtures yield
  their documented refusal or non-match reason.

### P02-M7 — Dedupe signals and stamp candidate cases

**Deliverables**

- Stable signal identity, case dedupe key, case-stamp request, and ledger events.
- Founder-created manual-signal input with title, metric or customer theme,
  source window, affected segment, reason, and dedupe result.

**Work**

- [ ] Derive the dedupe key from rule, entity/segment, source window, metric
      version, and relevant policy version.
- [ ] Create no more than one candidate for the same semantic signal.
- [ ] Pass a validated `signal.md` payload to Phase 01's case-stamping boundary
      when available; use a test double while Phase 01 is still in progress.
- [ ] Link materialized observation IDs and scan receipt to the new case.
- [ ] Preserve prior cases across later scan cycles.
- [ ] Validate a founder-created manual signal before investigation: require
      title, metric/theme, bounded source window, affected segment, and reason.
- [ ] Apply the same semantic dedupe policy before stamping a manual case; record
      whether it created or reused a candidate.
- [ ] Keep manual-signal creation deterministic and model-free.

**Acceptance evidence**

- Repeating and concurrently submitting the golden scan yields one signal and one
  case identity.
- Repeating the same valid founder-created manual signal reuses the same candidate;
  missing or unbounded required fields fail with actionable errors.

### P02-M8 — Replace the scan and connection presentation

**Deliverables**

- Scan-run drawer, rule-by-rule log, actual fixture freshness, import errors,
  running/failure/retry states, and unambiguous fixture labels.

**Work**

- [ ] Remove the client timer as the source of workflow truth.
- [ ] Stream or poll only persisted run state with safe reconnection.
- [ ] Show exact source window, adapter/fixture version, policy, matched/rejected
      rules, budget, and evidence materialized.
- [ ] Derive connection readiness and freshness from adapter execution records.
- [ ] Keep status announcements accessible and usable on narrow screens.

**Acceptance evidence**

- Closing/reopening the drawer or refreshing does not change or lose scan state.
- No UI element implies live PostHog, Stripe, or customer GitHub connectivity.

## Verification matrix

| Check | Required proof |
|---|---|
| Adapter contracts | All four fixtures pass the same provider-neutral contract suite |
| Determinism | Same fixture/policy produces byte-stable observations and results |
| Dedupe | Sequential, retry, and concurrent scan attempts yield one case |
| Missing/stale data | Refusal/non-match is explicit; no value is invented |
| Identity | No person-level claim without an accepted link |
| Import | Valid rows persist; invalid rows have actionable errors |
| Persistence | Scan state and receipt survive refresh and deployment |
| Truthfulness | Connection and source UI says fixture/sandbox explicitly |

## Demo checkpoint

Run the golden manual scan, open its receipt, inspect all five rule results, and
show that a repeated run returns the same case instead of creating a duplicate.

## Exit gate

- [ ] All eight milestones pass their acceptance evidence.
- [ ] Golden, missing, stale, contradiction, and low-sample fixtures pass.
- [ ] The scan is deterministic, persisted, bounded, and honestly labeled.
- [ ] Adapter contracts and case-stamp payload are stable for Phase 03.
- [ ] Phase 01's repository accepts the validated golden `signal.md`.

## Rollback and recovery

Keep fixture versions immutable. A faulty ruleset is superseded by a new policy
version; existing scan receipts and cases remain linked to the old version.
Rollback may disable a ruleset but never rewrite prior results.

## Handoff

Phase 03 may rely on bounded source ports, immutable observations, fixture
manifests, versioned metric definitions, scan/run identities, and the exact
case-linked evidence/query contracts.
