# E1 spec: the revenue-dip agent, as built

The owner approved this design with "build" on 2026-11-26. It condenses
sections `01-world.md` to `11-presentation.md`, `GLOSSARY.md` and ADRs
0001-0010, and settles what they left contradictory or unsaid (Fixes, below).
Where this file and a section disagree, this file wins. The tickets are
`issues/01-…` to `issues/32-…`, one per slice.

## 1. Control flow (eval path; the demo differs only where marked)

1. **Case.** Code builds the world from the world version and the case seed:
   the GA4 baseline, plus at most one cause and one decoy. The trigger is
   checked hourly on the case clock. The first hour where trailing-24 h store
   revenue is ≥25% below the same 24 h a week earlier becomes the frozen
   "now" and writes the **trigger record**. Demo: the same check on the
   session's case clock, written to the session log.
2. **Run opens.** The batch runner admits a run only if the money left covers
   (runs in flight + 1) × $0.50, then writes the run-log header to
   `outputs/e1-runlogs/<batch>/<run_id>.jsonl`.
3. **Loop.** Each send reserves its worst case in the shared ledger, goes to
   `deepseek-ai/DeepSeek-V4.1-Flash-1017` on Nebius, then settles from the
   price card, counting cached input at the cached rate. Per turn: up to 5
   read calls; `wait` and `propose` must be alone in their turn. Every call:
   validation, then the tool, then a result capped at 1.5k tokens. An intent
   line is fsynced before every send and every call.
   - **What ends the loop:** a valid `propose`, which ends the run and sends
     nothing back to the model. A proposal is forced (tools cut to `propose`)
     at 30 calls, or when the money left is below the next send's reservation
     plus one forced proposal.
   - **Whether the evidence is enough is the model's call** (owner,
     2026-11-26). No code checks sufficiency before the proposal; the prompt
     says what a proposal holds, never when one is ready. The grader measures
     it afterwards (decision, section 7).
   - **Fails:** 15 min of agent time (Fix F6), more than 300k bytes in one
     send, two malformed proposals, a second turn without a tool call (the
     first gets one nudge). **Void:** provider down, ceiling hit, model
     version changed, ledger unavailable, 30 min total wall time (F6).
   - Content errors (mixed kind, a target outside the affected orders, a
     citation never read) are graded, never retried.
4. **Price.** Code derives the kind of action from the effects, prices the
   rupees, and applies the policy version's flags and escalations.
5. **Approve.** Evals: the fixed rule approves at once, clock still. Demo: the
   merchant's card. The approval binds the hashes and is single use.
6. **Execute.** Checks every effect first, then applies in order: plugin and
   deploy, webhook, per order capture then mark-paid, customer updates. Stops
   at the first refusal and undoes nothing. Each operation has an idempotency
   key and its own intent and outcome lines.
7. **Verify.** Re-reads the raw backend ("landed"), watches 48 h of case
   clock ("fixed"), then realised rupees, the stamp and `closed`.
8. **Grade**, afterwards, in other files: pass = f(run log, answer key, world
   version, grader version). The judge runs after the batch; then the archive
   and a stamped manifest.

## 2. State

| What | Where | Written by | Survives a crash |
|---|---|---|---|
| Run log, append-only, hash-chained | `outputs/e1-runlogs/…`, then archived | harness, executor, verifier | yes, each line fsynced first |
| Simulator journal (F1) | beside the run log, one per run | simulator | yes, each write saved before the simulator replies |
| Spend ledger | SQLite in the git common folder, shared by all worktrees; ceiling in `order-recovery/spend.json` | every send | yes |
| Session log | one file per demo session | demo trigger loop | yes |
| Grades, metrics, annotations, judge calls | beside the run log, keyed by `(run_id, head)`; manifests in `reports/e1/` | analysis code | yes |
| World | memory, rebuilt from version + seed + clock + the simulator journal | simulator | rebuilt |
| Answer keys | hashes committed; held-out sealed by Codex | generator, Codex | yes |

No database. Approval is an event in the run log; an import lint keeps the
agent's code from reaching it.

## 3. Model or code

- **Model:** chooses what to read, links free-text messages to orders, tells
  lookalike causes apart, judges when the evidence is enough, picks cause and
  effects, writes the summary.
- **Judge** (`zai-org/GLM-5.3-Flash`): checks the summary's coherence only,
  beside pass.
- **Code:** clock, caps, validation, pricing, approval, execution,
  verification, grading. The security boundary is the approval record plus
  the executor's mechanics checks (ADR 0005, ADR 0010), never the model.

## 4. Failure cases

- **Send succeeds, log write fails.** `send_intent` is on disk; the restart
  closes the file `crashed` and opens a new run with `restart_of`. The
  reservation stays at worst case: spend is over-counted, never under.
- **Executor op lands, outcome line lost.** The simulator journal holds the
  landed write (F1); resume re-reads, logs `reconciled`, never repeats it.
- **The same job twice.** Same run id: the lock file refuses it. Second
  execution: `approval_used`; the notice store rejects a repeated key. Demo:
  one active run per dip. Batch runner started twice or after a crash: run
  ids are fixed, closed runs are skipped, a batch lock refuses a second
  runner (F5).
- **Tool times out or is malformed.** v1 tools are in-process with no
  injected faults. Bad arguments return an error envelope naming the fix (a
  call, counted for recovery). A throwing handler is `harness_error`, a fail.
  Provider timeout (180 s a send) or 429/5xx: 3 attempts, then void.
- **100 concurrent:** admission refuses about half ($24.89 ÷ $0.50 ≈ 49 in
  flight), as intended. Then Nebius 429s: their waiting no longer counts
  against the agent (F6). **1,000:** the ledger queues writers (busy timeout
  5 s, `BEGIN IMMEDIATE`, both already in `order-recovery/budget.mjs`); still
  busy is void `ledger_unavailable` and nothing is sent. Each run holds a
  ~2,300-order world, so one process runs out of memory before Nebius does;
  the pre-registration fixes the batch concurrency limit.

## 5. Rejected alternative

Write tools the agent calls itself after approval, as Razorpay's MCP server
works. Rejected: approval becomes one conversational turn, the grader must
rebuild intent from scattered calls, and "no write without approval" would
rest on the model holding back. One proposal executed by code keeps that rule
by construction and gives one object to grade, price, approve and replay
(ADR 0003).

## 6. Slices

32 tickets, 20 before development batch 1. Order and blockers are in each
ticket. The build order cuts from the bottom (27+), never from 01-20.

| # | Ticket | Its test |
|---|---|---|
| 01 | The E1 provider settles with cached tokens | settle-with-cache; prefix stability; correction refuses a settled send |
| 02 | A probe shows DeepSeek's tool calls and caching | request snapshot offline; paid send on the owner's word |
| 03 | A GA4 world with 7 real future days | revenue follows GA4; same seed, same hash; every "now" has 7 future days |
| 04 | The trigger freezes "now" and writes the trigger record | crossing hours fixture; distinct-window count; byte-identical copies |
| 05 | Payment causes: #670, late authorization, webhook, messages, decoys | counterfactual; #670 symptoms appear |
| 06 | Other causes and the 16 development answer keys | every cause crosses the trigger; counterfactual on all 16 |
| 07 | A simulator that remembers landed writes | kill after the journal write, before the reply: restart holds the write |
| 08 | Razorpay and dashboard read tools | doc-fixture shapes; pagination; leak scan |
| 09 | WooCommerce, GA4, deploy, issue and message tools | `X-WP-Total`; message paging; leak scan |
| 10 | Checks, `price_orders`, `wait` and the toolset hash | no-cause-words lint; `wait` stops at 7 days; 21 tools |
| 11 | `propose`: schema, kind of action, rupees | a mixed set fails; pricing formula; asks |
| 12 | Grader v1 with oracle, self-test and thin passes | oracle 16/16; planted bad proposals caught; thin flag |
| 13 | The checklist baseline and the floors | gate 4 with named reasons |
| 14 | The run log: chain, lock, cardinality | chain verifies; torn last line cut |
| 15 | The agent loop ends in every status | stub runs end in every status; throttle time off the agent clock |
| 16 | Admission, void restarts and the forced-proposal budget | admission refusal; `reservation_bound_broken`; `ledger_unavailable` |
| 17 | Approval record and fixed rule | hash binding; single use; `targets_changed` |
| 18 | The executor applies a proposal once | lost-ack and crash rows of the fault table |
| 19 | The verifier stamps landed, and `verify:e1` | green in under 2 min |
| 20 | A batch runner that never runs a run twice | concurrent start refuses; rerun skips closed runs |
| → | **Development batch 1 (paid, on the owner's word)** | |
| 21 | Annotation view and query CLI | round trip |
| 22 | Watch, realised rupees and the confusion table | post-sale proof case; webhook control case |
| 23 | The judge, its controls and log | ≥9/10 on controls (fixtures) |
| 24 | Stub-model replay and `replay --check` | byte-for-byte reproduction |
| 25 | Property tests and the rest of the fault table | fixed seed list |
| 26 | Statistics and the pre-registration file | known answers; clustered check; threshold in the hash |
| 27 | Session log, notices and inbox | lifecycle |
| 28 | Live lab, renderer and approval card | renders at 390 px |
| 29 | Export mask, manifest and timestamp | export refuses leaks |
| 30 | The `/e1` route | route test |
| 31 | The generated result block | `--check` fails a hand-edited number; thin label shown |
| 32 | Credits | lists every source |

## 7. Decision: a right answer on thin evidence (owner chose C, 2026-11-26)

Pass stays as pre-registered. A **thin pass** is a passing run that never saw
the decisive evidence in any result it was shown (from `call_outcome`, not
from what it cited). If more than 10% of the claim rung's passing runs are
thin, the headline carries "partly on thin evidence". Rows read against rows
available is reported per run. Overruled: A (coverage only beside pass), B
(coverage inside pass, biased toward the checklist).

Tests: a fixture run with the right cause that never read the decisive record
gives pass = true, thin = true and a report showing the label; a run citing a
record it never read is still `unread_record`; the 10% threshold is in the
pre-registration hash.

## 8. Proof bars

| Bar | Another cause that moves it | What tells them apart |
|---|---|---|
| Win: McNemar p < .05 vs the checklist, Wilson lower bound above every floor, unsafe ≤ checklist | decoys tuned against the checklist | clean/decoy split; held-out written by Codex |
| The win also holds with no-cause cases counted once per window (F2) | near-duplicate cases inflating n | the clustered check, pre-registered |
| Development pass^3 ≥90% before sealing | tuning on those 16 cases | only held-out answers it; dev figures labelled "tuned" |
| Thin passes ≤10% of passes | a shallow agent that proposes early and gets lucky | rows read vs available, coverage, calls per run |
| Oracle 16/16; self-test catches every planted bad proposal | a lenient grader | Codex's sealed bad proposals, by class |
| Rung BETTER (sign-flip, Holm) | noise (±5 cases between identical harnesses) or model drift | noise band; one model version for the reveal |
| Blind judge ≤13/20 on real/generated pairs | a weak judge | it must catch ≥8/10 planted giveaways |
| Expected cost about $0.02 a run | runs ending early on thin evidence | cost per pass^3 case, never cost alone |

## Fixes (owner asked for fixes 2026-11-26; each overrules in a word)

- **F1, simulator state.** The simulator keeps a per-run journal and saves each
  landed write before it replies; restart = seed + journal. Ticket 07.
  Overrule: `sqlite-sim`.
- **F2, shared no-cause windows.** The world reads GA4 to 13 Dec 2020 (the
  committed CSV runs to 31 Jan 2021) and recounts crossings; each held-out
  no-cause case gets its own window if enough exist. Either way the
  pre-registration adds the clustered check (section 8). Tickets 03, 04, 26.
  Overrule: `cut-no-cause`.
- **F3, gate batch budget.** Added: 48 runs, $3.54 planning, $1.01 expected.
  Practice planning shortfall becomes -$28.65; expected margin +$5.46.
  Overrule: `batch4-gate`.
- **F4, tool count.** 21 tools. An ask is a field of `propose` (section 5
  decision 8), not a tool; sections 10 and 11 read 21, and section 10 item
  18's subagent has no `propose` or `wait`. Overrule: `ask-tool`.
- **F5, batch reruns.** Run id = hash(batch, case, repeat 1-3, harness
  version); closed runs are skipped; an unclosed one is closed `crashed` and
  restarted under the existing rule; a batch lock refuses a second runner.
  Ticket 20.
- **F6, provider trouble.** The 15-minute cap counts model and tool time,
  not 429 backoff; a 30-minute total cap voids (`provider_unavailable`).
  A busy ledger after its 5 s timeout voids `ledger_unavailable`, unsent.
  Tickets 15, 16. Overrule: `timeout-fails`.
- **F7, future days.** Real GA4 days after each "now" (F2's wider read). The
  cause keeps acting in them until an approved fix lands, and stops from that
  hour. Ticket 03, 06.
- **F8, the owner's steps.** Zero data retention on; the word for the probe
  (ticket 02); the 15 Nov Usage-tab figure, which ticket 01's correction
  command settles. None blocks tickets 03-20.
