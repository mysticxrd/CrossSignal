---
type: stage-output
stage: 01
status: ready-for-review
evidence_retrieved: 2026-08-12
target_company: Result
project: CrossSignal
slice: onboarding-rescue
---

# CrossSignal onboarding-rescue specification

## Relationship to Result

Owner fact: Result is the company the project owner plans to join. CrossSignal
is a standalone portfolio and hiring project intended to impress the Result
team. Result is the target company and evaluation audience, not CrossSignal's
runtime platform, customer, or confirmed integration partner.

Decision: build Company Flight Recorder as an adjacent product and engineering
proof on this repository's own durable stack. Never present speculative
architecture or a private Result capability as fact.

## Public evidence

| ID | Label | Public observation | Product implication |
|---|---|---|---|
| `RESULT-01` | Public fact | [Result](https://www.result.dev/) presents an operating system for starting and running the next generation of businesses, spanning product, marketing, support, Company Brain, analytics, finance, and integrations. | Agent-run company operations make provenance and authority a relevant adjacent concern. |
| `RESULT-02` | Public fact | [The Future of Work](https://www.result.dev/thesis) argues that agents can compress the operational stack enough for solo founders or very small teams to run serious businesses. | A small operator needs leverage without losing legibility or control over consequential effects. |
| `RESULT-03` | Public fact | [Result's YC profile](https://www.ycombinator.com/companies/result) describes an end-to-end founder platform and identifies whole-flow attribution and Company Brain context as advantages. | CrossSignal should complement Company Brain and attribution rather than rebuild either one. |
| `RESULT-04` | Public fact | [Result Lab](https://lab.result.dev/) exposes operating metrics for a business built and run through Result, including revenue, activation, traffic, content, and learning views. | The demonstration should close a business loop beyond an AI-generated recommendation. |
| `FIT-01` | Inference | As a small operator delegates more company functions to agents, a legible record of evidence, authority, effects, and outcomes becomes more useful. | Flight Recorder is a plausible adjacent wedge; this does not establish Result demand or adoption. |
| `FIT-02` | Inference | A narrow working slice demonstrates more product taste and production judgment than a broad speculative platform. | Build one onboarding-rescue loop and make its failure behavior visible. |
| `UNKNOWN-01` | Unknown / non-claim | Result's private stack, APIs, agent topology, roadmap, security model, and hiring rubric are not established by these sources. | CrossSignal must not depend on or claim any of them. |

Sources were retrieved on 2026-08-12. `05_ship` must recheck any public claim
used in the final narrative.

## Product definition

Company Flight Recorder is the inspectable chain of custody around one
consequential agent-run business action: what evidence was used, what bounded
reasoning occurred, what exact effect was proposed, who authorized it, what was
attempted, and what outcome was later observed.

The differentiated relationship is:

- Company Brain answers **what the company knows**.
- Operating agents answer **what the company should do**.
- Company Flight Recorder shows **why an action was proposed, who authorized
  the exact effect, what happened, and what business outcome followed**.

The visible product is limited to four connected surfaces: an evidence and run
timeline, an exact Approval Inbox, a Trace Inspector, and an Outcome view.

## Primary user and problem

The primary user is a solo founder or small-company operator who delegates work
to agents but remains accountable for company effects and outcomes. The Result
team is the evaluation audience, not a fictional product user.

The operator currently lacks one trustworthy place to answer:

1. Which exact evidence and approved context produced this proposal?
2. Did a qualified human authorize this exact payload and intended effect?
3. What did the trusted executor actually attempt, including ambiguity or failure?
4. Did the registered business outcome occur, and how strong is the attribution?

## Golden path

1. A mirrored activation event and approved onboarding-feedback FIXTURE enter the canonical evidence ledger.
2. The system freezes the exact evidence and approved product, brand, policy, and metric context.
3. A fixed planner dispatches quantitative, qualitative, and experiment-design workers.
4. Validators and an independent skeptic reject invalid, uncited, injected, or contradictory claims.
5. The synthesizer creates one immutable onboarding email intent for a three-recipient TEST cohort.
6. Deterministic policy marks the action as approval-required.
7. The operator approves the exact recipients, content, cap, evidence, metric, context, policy, and expiry.
8. A trusted server-side executor consumes the one-time grant and attempts the capped TEST effect through an adapter.
9. A signed click or activation observation enters the ledger.
10. The system appends an honest `supported`, `unsupported`, `correlated`, or `inconclusive` assessment.
11. The Trace Inspector reconstructs the complete chain under one `trace_id`.
12. A mutated or expired approval and an ambiguous provider timeout visibly produce no unapproved second write.

## Scope

### Included in this slice

- One workspace and one owner/operator path.
- One approved immutable context snapshot and one fixed reasoning graph.
- Mirrored events and labeled FIXTURE evidence; no production customer data.
- One immutable email intent, deterministic policy verdict, and exact human approval.
- One capped three-recipient TEST adapter path with intended-effect identity.
- One outcome observation and qualified assessment.
- One golden trace and visible failure cases for mutation, replay, duplicate input,
  tenant isolation, interruption, and ambiguous provider response.

### Excluded from this slice

- A generic Company Brain, chat interface, RAG product, arbitrary agent swarm, or general DAG engine.
- Automatic refunds, deployments, pricing, or other broad consequential actions.
- A broad connector catalog, causal-inference platform, or production-scale observability program.
- Self-modifying policy, prompts, contracts, or approved knowledge.
- Claims of production scale, causal impact, exactly-once delivery, or private Result integration.

### Truth boundary

Every user-visible and evidentiary surface labels LIVE, TEST, and FIXTURE state.
Public Result observations remain distinct from CrossSignal inference. A provider
timeout after possible dispatch becomes `indeterminate`; the system does not
guess or blindly retry. Provenance alone never becomes causal proof.

## Acceptance criteria

| ID | Observable definition of done |
|---|---|
| `AC-01` | Starting from labeled evidence, one `trace_id` reconstructs the exact context manifest, graph nodes, artifacts, intent, policy, approval, action attempt, observation, and assessment. |
| `AC-02` | Approval is bound to the displayed recipients, content, cap, evidence, context, policy, nonce, and expiry; changing any bound value creates a new intent and the old grant cannot execute. |
| `AC-03` | The capped TEST action reserves one intended effect, records the provider result, suppresses confirmed duplicates, and never blindly retries an `indeterminate` attempt. |
| `AC-04` | The outcome view shows the pre-registered cohort, metric, baseline, window, evidence, limitations, and one honest supported/unsupported/correlated/inconclusive label. |
| `AC-05` | Workspace A cannot read, infer from, approve, or execute Workspace B's evidence, intents, grants, attempts, outcomes, or trace. |
| `AC-06` | After interruption, completed graph nodes remain durable and only incomplete work resumes under stable identities without duplicate effects. |
| `AC-07` | Duplicate or out-of-order ingress, direct execution, expired/replayed approval, prompt injection, undeclared context, and ambiguous provider response fail safely and leave visible evidence. |
| `AC-08` | Every screen and reviewer artifact makes LIVE/TEST/FIXTURE status unmistakable, and a fresh reviewer can reset, run, approve, inspect, and replay the failure case from written instructions. |

## Current repository truth

| Surface | What exists now | Gap before the specified slice |
|---|---|---|
| Identity and tenancy | Authenticated owner identity, server-side workspace checks, D1 rows scoped by workspace, and defensive relational constraints. | Extend authority to every context, trace, intent, grant, attempt, and outcome record. |
| Evidence and history | Versioned FIXTURE observations, approvals, case cycles, idempotent event keys, and additive events. | Freeze one exact context manifest and resolve every conclusion to evidence IDs. |
| Decision workflow | A durable staged case demonstration with approval hashes. | Implement the bounded planner/worker/skeptic/synthesizer graph and schema validation. |
| External effects | Simulated labels and fixture receipts only. | Add a trusted TEST adapter, intended-effect reservation, exact grant consumption, and indeterminate handling. |
| Outcomes | Fixture presentation and additive cycle history. | Pre-register metric/window and append a qualified assessment. |
| Reviewer proof | A polished prototype and real local verification. | Produce one replayable trace, adversarial proof, clean reset, deployed preview, and cold instructions. |

The current prototype is useful infrastructure, not evidence of a private Result
integration or of the behavior specified above.

## Evaluator thesis

In 90 seconds, CrossSignal should demonstrate:

> A solo founder can delegate an onboarding intervention to bounded agents
> without surrendering evidence quality, exact human authority, or an honest
> account of the resulting business outcome.

The internal quality rubric—explicitly not Result's hiring rubric—is strategic
relevance, differentiation from Company Brain, end-to-end depth, production
judgment, and unmistakable truth labels.

## Data-stage handoff

`02_data` owns how this accepted behavior becomes executable records. It must
define tenant ownership, provenance, hashes, event envelopes, graph and
authority state machines, migrations, validators, negative tests, the canonical
golden fixture, and reset semantics. It may refine representation, not silently
change the product promise or acceptance criteria.

## Explicit non-claims

- CrossSignal is not commissioned, endorsed, or integrated by Result.
- Public product descriptions do not reveal Result's private implementation.
- The fixed graph is CrossSignal's bounded design, not Result's known topology.
- Database, model, email, analytics, payment, queue, and live-update choices are CrossSignal decisions or adapters.
- The evaluator thesis is a project quality standard, not Result's hiring rubric.
- A compelling demonstration does not establish production scale, causal impact, or exactly-once delivery.

## Declared input hashes

File hashes are SHA-256 over file bytes. Directory hashes are SHA-256 over
UTF-8 lines of `repository-relative-path NUL file-sha256 LF`, sorted by full
path. These values are finalized by verification before the human gate opens.

| Input | SHA-256 |
|---|---|
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `README.md` | `8372e938a8fb552053f62eae6fa2a8b41ec8856678d244629f908e27934bf4e8` |
| `package.json` | `368b45c93653b264cbe2468f628bf4aa8aff98661b3291ffe9ac9fe12d47a0bc` |
| `app/` | `a619a249990cd42b2ba5231fa9865013f39e6fb5e602ec5befa354a065abefd8` |
| `db/` | `ed6a06fd76bd21b08d3a700044dfacc438bc4fdd07b98934e25a9afee270953d` |
| `drizzle/` | `54b195948ca74d7e219ed5c6aa7803eb862007f379ce4701d6bf9c1c4a36c23d` |
| `tests/` | `389cc7e53da069b6599ea01d6d3268c51f5166c7e8b829ba20ca1c21e5bcc9f8` |
| `factory/01_spec/verify.mjs` | `862956742d148dfabe1c9243ab8563189bf92a0013f07496f53c8044f14fe9cc` |
