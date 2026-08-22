---
id: phase-03
status: planned
depends_on: [phase-01, phase-02]
unlocks: [phase-04]
prd_requirements: [FR-05, FR-06, FR-07, FR-08, FR-13, FR-14, FR-18, FR-19]
evals: [EV-01, EV-02, EV-03, EV-04, EV-05, EV-06, EV-10, EV-11, EV-14]
---

# Phase 03 — EVE investigation over ICM

## Outcome

Produce the first undeniable proof that ICM and EVE work better together: a real
EVE session reads a scoped ICM stage, gathers bounded fixture evidence, receives
an independent skeptic challenge, writes a versioned artifact, parks for a human
edit, and resumes from the edited revision after interruption.

Evaluator-visible proof: the resumed trace reads the new artifact hash and the
downstream intervention reflects the founder's edit.

## Baseline

Phase 01 provides the canonical ICM repository, stage contracts, artifact
schemas, and editor. Phase 02 provides deterministic scans, immutable evidence,
and bounded provider-neutral source ports. Phase 00 has proven the deployment
topology but no product agent behavior exists.

## Entry criteria

- [ ] Phase 01 and Phase 02 exit gates are complete.
- [ ] A golden scan stamps a schema-valid investigation case.
- [ ] `IcmRepository` path and expected-head contracts are stable.
- [ ] Source ports return bounded structured results with exact provenance.
- [ ] The EVE topology ADR remains valid for the selected pinned version.

## In scope

- One EVE root case operator and one independently constrained skeptic.
- Authenticated server-side channel/adapter, durable case/run mapping, context
  materialization, bounded read/write tools, investigation skill, artifact
  validation, evidence-triage parking, continuation, cancellation, recovery,
  budgets, redaction, and owner trace UI.

## Out of scope

- Live source connectors or generic MCP/API access.
- Additional subagent fan-out that does not strengthen the demo proof.
- Consequential action execution, measurement, or schedules.
- Unrestricted shell, web, SQL, persistence, filesystem, or delegation.

## Architecture invariants

- EVE receives workspace/case scope from authenticated server context, never a
  model-controlled argument.
- A session materializes only the active contract, declared inputs, allowed
  references, and a disposable output subtree.
- EVE writes canonical artifacts only through the application-owned,
  path-scoped commit tool.
- The skeptic receives the submitted evidence brief, not hidden root history,
  and has no source or mutation capabilities.
- The ICM head and ledger are recoverable truth; session memory is not.
- Model output proposes typed artifacts; deterministic validators and transition
  tools decide whether they are admissible.

## Milestones

### P03-M1 — Finalize the pinned EVE implementation contract

**Deliverables**

- Exact version/lockfile, reviewed bundled-doc checklist, agent layout, runtime
  limits, and updated topology ADR.

**Work**

- [ ] Confirm the Phase 00 candidate version or record a reviewed change.
- [ ] Read the installed `node_modules/eve/docs/README.md` and relevant guides
      before writing framework code.
- [ ] Record documented channel, session, human-interaction, subagent, sandbox,
      eval, and deployment APIs for this version.
- [ ] Define one root agent and one skeptic; omit speculative agents/schedules.
- [ ] Pin model and workflow versions separately from the EVE package version.

**Acceptance evidence**

- The repository and deployment report one exact EVE version and no floating
  framework dependency.

### P03-M2 — Build the authenticated EVE service boundary

**Deliverables**

- Server-side EVE adapter/channel, signed case context, D1 `case_runs`/cursor
  mapping, continuation/cancel endpoints or actions, and authorization tests.

**Work**

- [ ] Authenticate every start, stream/reconnect, continue, cancel, and run-read.
- [ ] Reauthorize owner, workspace, and case for every operation.
- [ ] Store case ID, workspace ID, EVE session/run ID, phase, agent/workflow
      version, ICM head, status, cursor, budget, and timestamps.
- [ ] Keep continuation credentials and service secrets server-only.
- [ ] Reject supplied foreign run/session IDs even when structurally valid.
- [ ] Append lifecycle correlation events to the permanent ledger.

**Failure and recovery**

- Provider/runtime unavailability preserves the case and marks a retry-safe failed
  run; it does not fabricate an artifact.

**Acceptance evidence**

- Two-user/two-workspace tests cannot start, inspect, continue, or cancel a
  foreign run.

### P03-M3 — Materialize only declared ICM context

**Deliverables**

- Stage-context loader, allow-listed reference resolver, token/context manifest,
  and disposable session workspace.

**Work**

- [ ] Begin at `AGENTS.md`, route to the active stage, and load exact paths from
      that stage's `CONTEXT.md`.
- [ ] Separate trusted policies/schemas from untrusted business evidence.
- [ ] Refuse undeclared references, broad directory reads, traversal, and stale
      expected heads.
- [ ] Record loaded paths, hashes, sizes/tokens, and ICM head in the run manifest.
- [ ] Mount trusted control inputs read-only and expose only a disposable output.

**Acceptance evidence**

- Trace/run manifest proves the agent did not load the whole company workspace.
- Context remains within the declared ICM token budget.

### P03-M4 — Implement bounded source and local tools

**Deliverables**

- Read tools for product metrics, revenue metrics, support evidence, repository
  activity, and allow-listed Company Brain references.
- Local tools to validate an artifact, write one declared case output, and
  request a guarded transition.

**Work**

- [ ] Wrap Phase 02 source ports; do not expose provider SDKs or arbitrary query.
- [ ] Require window, metric/theme, segment, and limit for every evidence query.
- [ ] Return exact query parameters, samples, freshness, identity scope, and IDs.
- [ ] Treat embedded instructions as quoted untrusted evidence.
- [ ] Validate schema/provenance before committing through `IcmRepository`.
- [ ] Omit generic HTTP, SQL, shell, broad persistence, and unrestricted write
      capabilities.

**Acceptance evidence**

- Tool inventory and negative tests prove no undeclared external or filesystem
  operation is available.

### P03-M5 — Generate the evidence brief and disciplined hypothesis

**Deliverables**

- Investigation skill and real `evidence-brief.md` containing observations,
  contradictory evidence, inference labels, leading/alternative hypotheses,
  assumptions, confidence rubric, falsification test, target metric, segment,
  and window.

**Work**

- [ ] Require every material observation to resolve to an evidence/query ID.
- [ ] Keep deterministic metric arithmetic in tools, not model prose.
- [ ] Enforce causal-language policy and surface missing/stale data.
- [ ] Attribute agent/workflow/run and input hashes in frontmatter.
- [ ] Reject incomplete artifacts before transition.

**Acceptance evidence**

- Golden evidence reaches 100% material-claim provenance.
- Missing/stale fixtures lower confidence or block comparison without invention.

### P03-M6 — Add the independent skeptic

**Deliverables**

- Declared skeptic agent, constrained instructions/schema, child-run correlation,
  and attributed challenge section.

**Work**

- [ ] Pass only the submitted brief and rubric to the skeptic.
- [ ] Give it no source connection, mutation tool, shell, network, or approval.
- [ ] Ask for contradictions, alternative explanations, missing evidence,
      confounds, and invalid comparisons.
- [ ] Merge or attach its result without erasing attribution.
- [ ] On skeptic failure, show a warning and reduce confidence or park according
      to policy.

**Acceptance evidence**

- The desktop comparison/campaign alternative visibly qualifies the leading
  hypothesis.
- Capability inventory proves the child cannot mutate state.

### P03-M7 — Park at evidence triage and resume from the human edit

**Deliverables**

- Parked gate, editable artifact, separate attributed review record, continuation
  flow, and latest-head preflight.

**Work**

- [ ] Park without application polling after committing the draft.
- [ ] Allow edit/correct, annotate, continue, or dismiss with reason.
- [ ] Commit the human edit and review separately with their hashes.
- [ ] On continue, reload current ICM head and edited artifact before any planning.
- [ ] Reject continuation if authorization, policy, schema, or expected state
      changed incompatibly.

**Acceptance evidence**

- Change an assumption, refresh/restart, continue, and show the next trace reading
  the new hash; downstream planning reflects the edit.

### P03-M8 — Implement reconnect, cancellation, budgets, and recovery

**Deliverables**

- Stored event cursor, reconnect, real server cancellation, checkpoint/retry,
  visible partial artifacts, and server-owned cost/turn/tool/time/subagent limits.

**Work**

- [ ] Resume streams from saved cursors without duplicate UI events.
- [ ] Distinguish closing the browser from cancelling the server run.
- [ ] Stop safely at budget exhaustion and preserve admissible partial output.
- [ ] Support retry from latest valid artifact/head, not hidden memory.
- [ ] Display failure stage, retry safety, and owner controls.

**Acceptance evidence**

- Forced interruption after draft write and while parked loses no business state.
- Budget-abuse fixture stops with a visible reason and no fabricated completion.

### P03-M9 — Add owner-visible run correlation

**Deliverables**

- Developer panel linking case, ICM head, parent/child run, loaded context,
  tool calls, warnings/errors, latency, tokens, estimated cost, and ledger.

**Work**

- [ ] Fetch run details only after owner/case authorization.
- [ ] Redact direct identifiers, raw support text, secrets, and hidden reasoning
      before telemetry or UI rendering.
- [ ] Keep diagnostic trace links separate from permanent ledger events.
- [ ] Show actual status and metrics rather than hardcoded examples.

**Acceptance evidence**

- A maintainer moves from the case to the root run, skeptic child, exact tool call,
  committed artifact revision, and permanent ledger event.

## Verification matrix

| Check | Required proof |
|---|---|
| Context scope | Loaded-path manifest matches stage declarations only |
| Provenance | All material claims resolve to exact fixture/query IDs |
| Skeptic | Child has narrower capabilities and changes/qualifies the brief |
| Human gate | Latest edited artifact hash is read after continuation |
| Interruption | Refresh, cancel, and restart preserve canonical progress |
| Injection | Embedded support instruction causes no policy/tool change |
| Authorization | Foreign run/session operations fail closed |
| Budgets | Exhaustion stops safely with partial artifact and reason |
| Trace | Case, ICM head, run, child, tools, usage, and ledger correlate |

## Demo checkpoint

Run the real investigation, open the skeptic result, edit the evidence brief,
refresh or interrupt, continue, and show EVE rereading the new artifact hash.
This is the program's first non-negotiable ICM + EVE proof.

## Exit gate

- [ ] All nine milestones pass their acceptance evidence.
- [ ] EV-01 through EV-06, EV-10, EV-11, and EV-14 have real stored results.
- [ ] The combined edit/interruption/resume demonstration is repeatable.
- [ ] No generic high-authority agent capability exists.
- [ ] Case, artifact, run, skeptic, usage, and ledger correlation is visible.
- [ ] Phase 04 can rely on the parked interaction and latest-head preflight.

## Rollback and recovery

Disable new EVE starts while retaining ICM artifacts and D1 run/ledger records.
Allow owners to inspect or close existing cases manually. Never delete valid
artifacts because a session or trace provider failed.

## Handoff

Phase 04 may rely on authenticated EVE continuations, context reload, artifact
validation/commit tools, human-gate parking, run correlation, and permanent
ledger conventions.
