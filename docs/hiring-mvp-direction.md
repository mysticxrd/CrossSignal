# CrossSignal — current hiring MVP direction

Updated: 2026-09-26. This is the current product-priority and session-handoff
record. It supersedes older next-step guidance in the dated progress and phase
notes. It does not replace accepted factory artifacts or record a human gate.

## Goal and next milestone

Build a Revenue Leak Investigator for a replayable synthetic company. A Case
should connect detection, competing explanations, supporting and contradictory
evidence, a justified recommendation, exact human approval, a simulated
intervention, observed synthetic results, and independent evaluation.

**Next: A01 — a deployment breaks checkout for Indian debit cards.** Complete
one investigation-and-intervention loop before expanding scenarios. The
[reviewable A01 handoff](a01-synthetic-investigation-handoff.md) defines its
acceptance checklist, boundaries, proposed contracts, and required gate.

Real payment checkout, a payment sandbox, actual Mobile Safari verification,
and genuine business recovery are separately labeled future verification.
None is a prerequisite for this synthetic milestone. Simulated time advances
locally; the milestone does not wait for seven real calendar days.

## Verified repository state

The authoritative product checkout is
`C:\Users\hisha\ChatGPT\CrossSignal\work\crosssignal-phase1`:

- Branch: `codex/phase3-decision-ux`.
- HEAD: `d802898b2ced1580c1b196bfcd0ba82f3332b32a`, golden replay committed.
- The detector scenario matrix, its reports/tests, package alias, and prior
  progress-note changes are still uncommitted. They have not been duplicated.
- Pre-existing `supabase/.temp/cli-latest` remains untracked and preserved.
- The outer repository is on `codex/supabase-migration` at
  `ca44f2eb180ed2d7d1fba1b606208a3294d4830d`; its untracked
  `Software Factory - Keeping AI Agents Aligned.md` is preserved.
- The nested `origin` still names the obsolete OneDrive path. No remote
  operation, clone, initialization, reset, clean, or replacement occurred.

These are observations on the correction date, not permanent assumptions.
Recheck Git state before the next task. [Verification evidence](hiring-mvp-reconciliation-evidence.md)
records the commands, preserved hashes, and limits.

## Demonstrated capabilities and remaining gaps

| Area | Existing evidence to preserve | What A01 must add |
| --- | --- | --- |
| Detection | Mobile Safari fixture: 56 observations; 20.00% to 8.57% conversion; 42 evidence references; $800 projected fixture gap | An incident with revenue, engineering, and support observations that discriminate between causes |
| Investigation | Deterministic three-claim report; desktop contradiction; cause explicitly unconfirmed | Two or three competing explanations, purposeful contradiction search, remedy or abstention |
| Authority | Exact manual-check approval; canonical payload/context/policy checks in existing authority infrastructure | New exact simulated rollback intent and grant; a manual-check approval cannot authorize rollback |
| Simulation | Operator-selected capture/decline and trace-bound coverage assessment | State transitions caused by an approved intervention; correct, wrong, and absent intervention differ |
| Case history | Persisted evidence, approvals, immutable trial exclusion, saved simulation traces | Durable investigation through synthetic outcome, resolution or uncertainty, and interruption recovery |
| Replay | Committed golden replay; uncommitted seven-variant detector matrix with six invalid inputs; separate graders | A01 lifecycle replay and grading of diagnosis, evidence, contradiction search, action, authority, and outcome |
| Model evaluation | None demonstrated; current findings are deterministic | Local model configuration and tool transcript, if a suitable model is available; separate mechanics and behavioral results |

The local regression suite passes **29/29** on 2026-09-26. Its replay tests
compare fresh processes and reject altered artifacts. That establishes bounded
software behavior, not AI investigation quality or benchmark accuracy across
causally different incidents. A01 was not found in the inspected product,
scripts, tests, or documentation; the Mobile Safari Case is not equivalent.

## Reconciled guidance

Source: [CrossSignal MVP — Revenue Leak Investigator (Hiring Build)](https://app.notion.com/p/3d3cb716dfb4811dbc78ef6385011a0a),
read on 2026-09-26, page last edited 2026-09-24T15:22:50.256Z. Sections 2, 6,
17, 21–24 supply scope, Case invariants, the broader completion criteria,
factory boundaries, and strategic direction. The user's 2026-09-26 correction
sets the current sequence when older sections conflict.

| Obsolete or ambiguous guidance | Current interpretation |
| --- | --- |
| Perform a real checkout and collect seven genuine days before replay | Future real-world verification only; A01 uses simulated observations and time |
| Golden replay is not implemented | Completed in `d802898`; retain it as regression coverage |
| Add more detector counterfactuals as the primary next step | Preserve the matrix; prioritize the causal investigation and intervention loop |
| Capture plus decline means a repaired incident | It establishes harness coverage; the current Case remains unresolved |
| Five factory stages or six implementation phases mean MVP completion | Factory acceptance belongs to historical L14; phase numbers describe implementation history |
| Carry the fixed planner/worker/skeptic graph into the new product | Start with bounded domain tools and hypothesis/contradiction behavior; compare architectures later |
| Build 100 scenarios now | Complete A01, then five and ten causally different incidents and baseline comparisons; the broader benchmark follows |

The Notion page still contains the old real-check next step and stale replay
status near its top. This repository record resolves that conflict using the
user's correction and section 24. No Notion content was changed. The existing
README and compiled architecture snapshot describe historical proof; their
accepted artifacts were not rewritten to imply A01 completion.

## Preserved safeguards

Keep the Mobile Safari fixture and all existing replay reports and tests.
Keep tenant-scoped immutable history, exact payload/context/policy approval,
one-time execution, Global Pause, explicit failure/indeterminate states, and
the excluded trial receipt. Do not repurpose the old receipt or approval.

Every A01 outcome must say **SIMULATED**. Existing FIXTURE inputs retain their
labels. Device verification and real business outcome remain separate. The
synthetic $800 projection is neither actual lost revenue nor recovered money.
No TEST database, deployed service, LIVE system, or provider was changed by
this reconciliation.

The existing runners do not import or pass evaluator answer files. Their
separate processes are not an enforced filesystem sandbox. A01 must also
deny evaluator-file access from the investigator and its tools, exclude
answers from inputs/responses/prompts, and verify attempted disclosure fails.

## Current gate and next decision

`node factory/status.mjs` reports all five historical L14 stages complete,
accepted, and fresh; **active stage: none; release: unsealed** because the
worktree contains changes. There is no currently authorized A01 build stage.

[factory/CONTEXT.md](../factory/CONTEXT.md), “Seal and start the next run,”
requires a sealed commit and a human-owned run transition before Stage 01.
The existing gates are preserved. The A01 handoff is complete enough to review
between runs; it is not a newly instantiated or accepted factory stage.

**Next required decision:** review the A01 handoff and authorize the next-run
transition, including preservation of the current uncommitted work and how to
establish the required clean baseline without deleting or committing unrelated
files. Then prepare and review the new Stage 01 outputs using this handoff.
Do not infer Stage 01 acceptance from this strategy correction.

After the required transition, follow Spec → Data → Build → Verify → Ship,
stopping at each existing human gate. Once the A01 milestone passes, recommend
five, then ten causally different incidents with deterministic and model
baseline comparisons. Do not start those expansions within this milestone.
