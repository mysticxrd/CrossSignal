---
type: scope-amendment-proposal
amendment: b01-hiring-showcase-v1
parent_unit: b01-api-behavioral-benchmark
stage: 03_build
status: pending-human-review
evaluation_schedule_executed: false
larger_b01_complete: false
---

# Hiring showcase first — exact scope proposal

The primary objective is to demonstrate the owner's engineering capability for
a Result.dev job conversation. Prioritize one inspectable workflow and a small,
honestly reported evaluation. This is an additive initial-showcase scope overlay
on the accepted B01 Spec/Data, not a replacement factory run or a declaration
that the larger milestone is complete. No accepted source or gate is rewritten.

Result's public product combines business analytics, AI, Company Brain and a
provisioned backend. Connecting a revenue signal to evidence and a durable Case
is a relevant product demonstration. That relevance is an inference from its
[public site](https://result.dev/), not a verified hiring rubric or job offer.

## Requested initial deliverable

Synthetic revenue drop → Gemini reads permitted evidence → compares explanations
and searches for counterevidence → cites support and contradiction → recommends
a proportionate next step or makes an evidence-based abstention → saves a
readable, reloadable Case. No consequential action is performed. An API error
is a failure, not an epistemic abstention or a successful investigation.

Use the five existing frozen synthetic cases, their unchanged observable/private
packages, cutoff, split, output schema, rubric and task. One fresh investigation
per Case for each of the existing methods: rules, single-shot Gemini, tool-using
Gemini. Five rules + five single-shot + five tool investigations = **15 records**.
No new case generation, answer lookup, transfer-set tuning or model substitution.
Use replicate index 1 and fresh host identities; preserve stable evidence facts/IDs.
The earlier two retained B01 records remain separate, never credited to this
fresh schedule. PLAN_DRAFT.json creates draft identities only and dispatches none.

## Exact accepted criteria affected

Source: accepted [Spec](../../../../factory/01_spec/output/SPEC.md),
normalized SHA-256 e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e.
Accepted [Data](../../../../factory/02_data/output/DATA_PACKAGE.md),
normalized SHA-256 ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f.
Both accepted gates and verifications remain unchanged and fresh.

- **AC07 — change for the initial showcase only.** Replace the initial 35-record
  schedule (5 rules, 15 single-shot, 15 tool) with 15 (5/5/5). Defer the 20 extra
  initial repeats. Keep frozen manifest/configuration, fresh contexts, failure
  denominators, immutable transcripts, independent rubric assessment and
  method-blinded human adjudication. One replicate offers no variance estimate.
- **AC09 — defer from the initial showcase.** Dominant development-failure
  selection, preregistered investigator change, paired improvement measurement
  and its 15 new records remain NOT_RUN. Retain the development/transfer split
  and all original results. Repairing a request adapter is engineering work,
  not a measured behavioral improvement experiment.
- **AC13 — defer from the initial showcase.** The exact local-human-approved
  SIMULATED intervention, effect and post-action outcome remain NOT_RUN. The
  demo stops at recommendation/abstention and saved Case. Existing exact
  authority/Pause/replay protections remain essential under AC11. No runtime
  grant is implied; present instructions prohibit intervention.
- **AC02 — retain the investigation requirement, narrow this walkthrough's end.**
  A real scored Gemini investigation must choose bounded queries and return an
  inspectable finding on the A01-derived case. Its recommendation ends at a
  readable Case; the intervention is deferred under AC13. A scripted/rules
  answer or provider failure cannot substitute for that model evidence.
- **AC16 — initial-showcase packaging scope.** Keep cold saved-result inspection,
  reload validation and independent grading; distinguish them from fresh model
  inference. Prepare a separate fresh-run path only after this exact overlay
  is accepted and prerequisites pass. Full B01 release replay/regrade and
  Stage 04/05 packaging remain required for the larger milestone, unstarted here.

No other acceptance criterion is relaxed:

- **AC01/AC03:** same five causal generators, evidence-limited fifth case,
  frozen expected judgments and split; common allowed evidence/cutoff/output;
  same pinned Gemini/configuration across the two model methods. Record the
  intentional eager/query presentation and compute difference.
- **AC04/AC05:** actual isolation/injection/tenant/time/argument probes and
  bounded tools; private truth, rubric, Spec, old answers, development chat and
  old reports remain inaccessible to the investigator. Malformed/foreign/native
  calls and all provider/budget failures terminate visibly.
- **AC06:** current selected-model support, exact route/schema/usage compatibility,
  verified Free allowance with billing disabled and sufficient request/token/rate
  quota, host-only credentials, $0 paid ceiling, no fallback. No caller flag or
  stage acceptance authorizes spending. Current HTTP 400 blocks more requests.
- **AC08:** diagnosis, support/contradiction, unsupported claims, alternatives,
  abstention, recommendation, tool efficiency, latency, usage and charges remain
  separate per-record dimensions. Active countersearch differs from merely
  listing a contradiction. Unknown measurements remain null with a reason.
- **AC10:** five synthetic cases support a small demonstration, not robust
  accuracy/calibration, general model superiority or actual business recovery.
- **AC11/AC12:** tenant and exact intent/context/policy authority, Global Pause,
  one-time effects, append-only history, interruption/reload and retained A01
  databases/fixtures/evaluator/excluded trial. No new authority subsystem.
- **AC14/AC15:** existing dependencies, tools, persistence and product components;
  scoped changes and historical test compatibility without deleted assertions
  or regenerated accepted evidence. Existing full-project lint failures remain
  visible; tests are not silently excluded to make a gate pass.

## Original limits remain mandatory

8192 combined working-context tokens; 1024 response tokens including reasoning;
6144 cumulative generated tokens; at most 12 model turns (one for single-shot);
10 tool attempts including invalid; 50 rows/result; 160 query characters;
180s/request and 900s/investigation; concurrency one; automatic retries zero.
Keep complete provider request/serialized-body counts before each generation,
shrinking output reservations and terminal unknown usage. MINIMAL thinking is
not assumed zero reasoning. No truncation, byte-only admission or repair turns.

Fresh contexts contain only allowed synthetic observations, task/schema and
current-run bounded read-only results. Use GEMINI_API_KEY only in the trusted
host, never print/log/store its value or send it to the worker. No native search,
file/code/MCP tools, manual chats, standalone smoke generation, paid API route,
purchase, download, installation, deployment, LIVE change or runtime effect.

Fifteen records do not mean fifteen requests. With the existing ceilings the
draft conservatively allows at most **65 generateContent dispatches** (5 single
+ 5 × 12 tool turns), **50 tool attempts**, and **35840 generated tokens**
including reasoning (5 × 1024 + 5 × 6144). Existing two-count admission plus
initial-context readiness can add up to **150 countTokens calls** and one model
metadata GET. These are ceilings, not a forecast or new authorization. Unknown
usage, a rate/quota failure or unclear compatibility stops before another call.

## Showcase completion and relation to B01

The initial showcase needs a valid end-to-end Gemini tool investigation or
appropriate evidence-based abstention, all 15 immutable records, truthful
per-record review under the unchanged rubric, at least one inspectable retained
failure path, reload proof and a three-minute walkthrough with source links.
Losing to rules is a valid result; missing model output is not a completed happy
path. Current materials are offline preparation with a retained failed request.

The original 50 planned records become 15 initial-showcase records plus 35
deferred records (20 repeated initial + 15 changed experiment). The intervention
is additionally deferred, not counted among those 50 investigation records.
The original B01 criteria AC07/AC09/AC13 and full release packaging therefore
remain unsatisfied. B01 Stage 03/04/05 and the larger hiring milestone must not
be marked complete merely because this smaller showcase is reviewed.

Scope acceptance approves this overlay and its Data compatibility only. It
does not accept Stage 03 Build, repair HTTP 400, refresh account/quota proof,
grant runtime authority, advance later stages or seal/commit anything. Before
actual execution, implement the exact accepted 15-record route additively,
freeze revised sources/manifest and reverify every prerequisite. The existing
35-record execute command and its immutable claim are left untouched.

## Current blockers and exact review

1. Accept, request changes to, or reject **b01-hiring-showcase-v1** using this
   exact proposal hash and DATA_COMPATIBILITY/PLAN_DRAFT bindings in HUMAN_GATE.md.
   No changed schedule executes while this decision is pending.
2. Resolve the retained generateContent HTTP 400 using offline request/schema
   review and bounded secret-free diagnostics. Its error body was not retained;
   the parameter cause is unconfirmed. Support and token counts alone do not
   establish generation compatibility. No blind replay or substitute model.
3. Review the additive outer-index observation; the original raw-byte assertion
   remains blocked although indexed content/HEAD and files were unchanged.
   Preserve both baselines and snapshot. No reset or silent preservation waiver.

The current stage says: "A person reviews exact Build/VERIFY hashes. Behavioral
losses are valid results; missing model/demo evidence stays NOT_RUN. Verify
stage cannot begin without acceptance." ([Stage contract](../../CONTEXT.md))
This packet remains inside Stage 03; the stage's existing gate stays untouched.
