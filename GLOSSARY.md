# CrossSignal

CrossSignal investigates why a merchant's revenue dipped, names the cause among
causes that look alike, and proposes a fix a person approves. These are the
words its design, code and reports use.

## The merchant world

**Merchant world**:
The simulated WooCommerce store and its Razorpay account that every case is built from: orders, payments, refunds, webhooks, settlements, plugin versions, deploys, traffic and customer messages.
_Avoid_: simulator, sandbox, environment

**Baseline world**:
The merchant world over five weeks with no cause in it.
_Avoid_: clean world, control

**World version**:
One pinned, hashed edition of the merchant world's rules; results are comparable only within one world version.

**Store records**:
What WooCommerce holds: orders and their statuses.
_Avoid_: merchant ledger, shop data

**Razorpay records**:
What Razorpay holds: payments, refunds, webhook deliveries and settlements.
_Avoid_: gateway ledger, PG data

**Sale week**:
The days the merchant's own calendar marks as a sale, when store revenue runs far above its normal rhythm.
_Avoid_: Black Friday, spike, promotion period

## Revenue

**Store revenue**:
The value of orders the store shows as Processing or Completed; the figure the merchant watches and the one a dip is measured on.
_Avoid_: revenue (unqualified), sales

**Captured revenue**:
The value of payments Razorpay has captured.

**Settled cash**:
Money Razorpay has paid out to the merchant's bank.
_Avoid_: payouts, revenue

**Dip**:
A fall in store revenue that the trigger catches, from the hour it fires until it closes; a store has at most one open dip at a time.
_Avoid_: drop, incident, anomaly

**Trigger**:
The internal event when store revenue over the trailing day falls far enough below the same day a week earlier; it starts a run and messages no one.
_Avoid_: alert, alarm, detector

**Trigger record**:
The code-made description of a dip that a run starts from, identical to what the checklist baseline starts from; nothing else enters a run.
_Avoid_: alert, input, prompt

**Case clock**:
The simulated time a case runs on; it moves only when the agent waits or someone advances it, never with wall time.
_Avoid_: world clock, simulation time, now (alone)

## Cases and causes

**Case**:
The baseline world plus at most one injected cause and optional decoys, seen at one frozen moment, with its answer key.
_Avoid_: scenario, test, episode

**Cause**:
The change in the world that produced the dip.
_Avoid_: root cause, incident, issue

**No-cause case**:
A case whose dip comes from the world's normal rhythm, so the right answer is to change nothing.
_Avoid_: false positive, control case

**Lookalike**:
A cause whose symptoms overlap another cause's, so only specific evidence tells them apart.
_Avoid_: twin, confounder

**Decoy**:
An innocent event placed in a case that shows the surface of another cause but does not move store revenue.
_Avoid_: distractor, red herring, noise

**Side finding**:
A real problem the agent notices that did not cause the dip, reported apart from the cause.
_Avoid_: secondary cause, bonus finding

**Answer key**:
A case's correct cause, affected orders, rupee impact, kind of action and decisive evidence, fixed when the case is made and before any run.
_Avoid_: label, ground truth, gold

## Razorpay mechanics

**Capture window**:
The time an authorized payment can still be captured before Razorpay refunds it automatically.
_Avoid_: capture deadline, auth window

**Recoverable rupees**:
Money from affected orders that is still inside its capture window or otherwise retrievable.

**Lost rupees**:
Money from affected orders that can no longer be recovered.

**Late authorization**:
A payment that turns authorized after the order was already marked failed, with no plugin fault.

**Webhook disablement**:
Razorpay turning off a merchant's webhook after a day of failed deliveries, leaving new orders stuck.

## Investigation and action

**Check**:
One of the checklist baseline's single-signal tests, which the agent may also run and which returns the numbers the test looks at, never its verdict.
_Avoid_: rule, detector, flag

**Wait**:
The agent letting the case's clock run forward during a run so records can change; a proposal to wait instead names the time it will check again.
_Avoid_: sleep, pause, hold

**Proposal**:
The agent's final answer in a run: the cause it names, the records it cites and the effects it asks for; nothing in the world changes until it is approved.
_Avoid_: recommendation, action plan, finding

**Effect**:
One change to the world a proposal asks for, such as capturing payments or rolling back a deploy, applied by code only after approval.
_Avoid_: action, write, fix

**Toolset version**:
One pinned, hashed edition of everything the agent's tools show it (names, descriptions, shapes and limits); changing any part of it is a harness change.
_Avoid_: tool config, tool schema

**Prompt version**:
One hashed edition of the system prompt the agent starts every run from, including the merchant facts it states.
_Avoid_: prompt config, instructions

**Harness version**:
One hashed edition of everything around the model that shapes a run: the prompt version, the toolset version and the loop's settings; a harness change changes exactly one of them.
_Avoid_: agent config, setup

**Turn**:
One model reply within a run and the tool calls it made; the call cap counts calls, not turns.
_Avoid_: step, iteration, round

**Investigation step**:
One of the named stages of an investigation (read signals, candidate causes, test the lookalike, price, propose), labelled on a run log afterwards and never enforced during the run.
_Avoid_: step (alone), phase, state

**Forced proposal**:
The single proposal a run is made to give when it reaches its call cap or spending cap; graded like any other and counted apart.
_Avoid_: fallback answer, timeout answer

## Approval

**Priced proposal**:
A proposal together with the rupees code priced for it and the flags code raised on it, exactly as the approver sees it; what an approval agrees to.
_Avoid_: approval request, card (alone)

**Approval**:
A single-use yes to one priced proposal as a whole, given by a person in the demo or by the fixed rule in eval runs; it lapses if any record its effects touch changes before execution, other than by that proposal's own operations that already landed.
_Avoid_: grant, sign-off, consent

**Fixed rule**:
How eval runs approve: every well-formed priced proposal, at once, with the case's clock standing still; never a simulated person.
_Avoid_: simulated approver, auto-approval, surrogate

**Rejection**:
A merchant's no to a priced proposal; it closes that proposal and stops automatic re-runs for the same dip.
_Avoid_: veto, "no is a no" (that phrase belongs to a customer's opt-out)

**Expiry**:
The moment on the case's clock after which a priced proposal can no longer be approved: its earliest capture deadline, or a day after it was made if it captures nothing.
_Avoid_: timeout, TTL

**Policy version**:
One hashed edition of the checks, limits and mechanics code applies while pricing and executing a proposal; it shapes what the approver sees and what execution may do, never the run, so it sits outside the harness version.
_Avoid_: rules, guardrail config

**Escalation**:
A second confirmation a priced proposal needs because it crosses a limit; it never refuses the proposal.
_Avoid_: double approval, hard cap

**Ask**:
An order a proposal hands to the merchant to decide instead of acting on it; it changes nothing and is never answered within a run.
_Avoid_: question, escalation, referral

**Opt-out**:
A customer's standing no to being contacted; code never sends that customer a customer update, whatever a proposal asks.
_Avoid_: unsubscribe, consent flag

**Stop**:
A person halting a proposal's execution between operations; what landed stays, and only a fresh approval resumes the rest.
_Avoid_: kill, abort, cancel

**Partially applied**:
A proposal whose execution stopped after some of its effects landed and before the rest, with nothing undone.
_Avoid_: half-applied, rolled back, failed execution

**Customer update**:
A message code sends a customer from a fixed template when an approved proposal asks for one.
_Avoid_: notice, notification, message (that word is for what customers write)

**Guard catch**:
An unsafe effect a proposal asked for that the executor or a limit stopped; it still counts against the run and is reported beside pass as the safety net's work.
_Avoid_: blocked action, prevented error

## Verification

**Verifier**:
Code apart from the executor that re-reads both sets of records after execution and says whether each approved operation landed, without the answer key.
_Avoid_: checker, validator, post-check

**Pre-existing disagreement**:
A payment and its order that already disagreed when execution began; it is tagged and never charged to the run.
_Avoid_: baseline error, known issue

**Mismatch**:
A disagreement between records that is new since execution began, or an operation whose re-read state differs from what the executor recorded.
_Avoid_: verification failure, drift, inconsistency

**Watch**:
The stretch of case clock after execution, or after a wait's re-check, during which code compares store revenue with its normal rhythm, leaving the sale week out.
_Avoid_: monitoring, observation period, soak

**Verification stamp**:
The line that ends every run log, giving one result per meaning of verified (landed, fixed, realised), with "not run" and its reason where a meaning doesn't apply.
_Avoid_: verification status, badge

**Realised rupees**:
The value of targeted orders whose intended end state the verifier confirmed, measured in the same unit as the priced recoverable rupees.
_Avoid_: recovered revenue, actual impact

## Scoring

**Checklist baseline**:
Code that runs one fixed check per cause, each on a single signal, in a fixed order, and answers with the first match's cause and playbook; what a merchant has without the agent.
_Avoid_: rule baseline, heuristic, script baseline

**Development case**:
A case the agent's builder may read, run and tune against.
_Avoid_: train case, dev example

**Held-out case**:
A case written by someone other than the agent's builder, sealed by hash and revealed once, after the agent and the checklist baseline are frozen.
_Avoid_: test case, hidden case, sealed case

**Clean case**:
A case with a cause and no decoy.

**Run**:
One attempt by the agent at one case, from its first read to its final proposal.
_Avoid_: trial, episode

**Run log**:
One append-only, hash-chained file per run holding everything it sent, read, called and proposed and everything done with its proposal, in order; never rewritten, with grades, labels and scans kept beside it; what evals, replays and error analysis read.
_Avoid_: trace, transcript

**Replay**:
A page that shows one run log as recorded, with everything code derived from it in a separate, labelled pane; published replays are masked copies.
_Avoid_: playback, trace view

**Determinism check**:
Re-running every call a run log records against the regenerated world at its logged clock and comparing the results byte for byte, with no model call; a difference means the world version failed to pin something.
_Avoid_: replay test, re-run

**Stub-model replay**:
Running the real harness against the regenerated world with a fake provider that returns a run log's recorded replies, to show the harness reproduces the same requests, envelopes and decisions.
_Avoid_: mock run, dry run

**Price card**:
One committed, hashed set of the provider's prices and the date they were read, named in every run log's header; settled cost is usage times the price card.
_Avoid_: pricing, rate sheet

**Void run**:
A run stopped by something outside the agent and its harness, such as the provider failing after its retries, the spend ceiling or the model changing mid-run; it is restarted once and never scored.
_Avoid_: aborted run, infra failure, flake

**Pass**:
A run that names the right cause and kind of action, prices recoverable rupees within tolerance, proposes nothing unsafe and loses no rupees by its own waiting.
_Avoid_: success, correct answer

**pass^3**:
The share of cases where all three runs pass; the three runs see the identical world and share no memory, so only the model's sampling differs.
_Avoid_: consistency score, reliability

**Decisive evidence**:
The few things a person must see to tell a case's cause from its lookalikes and rule out its decoys, named in the answer key when the case is made.
_Avoid_: key evidence, required reads

**Evidence coverage**:
The share of a case's decisive evidence a run actually saw, reported beside pass and never part of it, so a miss can be traced to not looking or to misreading.
_Avoid_: recall, retrieval score

**Failure mode**:
A named way runs go wrong, found by reading run logs rather than imagined beforehand.
_Avoid_: bug class, error type

**Floor**:
An answer that never reads the records, such as always no cause, scored by the same grader; a method must beat every floor before its score says it read anything.
_Avoid_: dummy baseline, trivial baseline

**Grader version**:
One hashed edition of the grader, the verifier, the answer-key format, each check's mode and the grader self-test; the change a grader judges can never alter it.
_Avoid_: scorer config, eval version

**Check mode**:
Whether a grader check is off, observes (logs what it would have flagged) or enforces (changes the result); part of the grader version.
_Avoid_: dry run, shadow mode, soft check

**Oracle proposal**:
The proposal built from a case's answer key with no model, which the grader must pass and the verifier must stamp as the key expects.
_Avoid_: gold answer, perfect run

**Grader self-test**:
The oracle proposals, planted bad proposals and boundary-good proposals the grader must sort correctly before its verdicts count, half of the bad ones written by someone other than the grader's builder.
_Avoid_: grader tests, sanity set

## Model and budget

**Model version**:
The provider, the model id and the build the provider reports that a run's replies came from; a change in any of them is a different model, and scores are compared only within one model version.
_Avoid_: model, model name, endpoint

**Practice**:
The development batches run before the reveal is paid for, ending with the gate batch, the development batch that checks the pass^3 bar on the model the reveal will use.
_Avoid_: dev phase, tuning runs, warm-up

**Decision point**:
The moment after practice when measured cost per run, the money left and the reveal's cost are set side by side and the owner decides how the reveal is paid for.
_Avoid_: checkpoint, budget review

**Planning cost**:
The cost of a run if the provider caches nothing, used to decide what fits; it is neither a send's reservation, which bounds the worst case, nor the settled cost, which is what was spent.
_Avoid_: worst case, estimate, budget

**Reveal admission**:
The check before a reveal that the money left covers every rung's runs at planning cost; a reveal that would not fit does not start.
_Avoid_: pre-flight, budget gate

## The merchant's view

**Notice**:
Any message to the merchant, urgent when they have something to decide or do and quiet when a question has been answered; a trigger alone sends none.
_Avoid_: alert, notification, customer update

**Re-check**:
The moment a wait proposal names, when code looks at the trigger again and starts a fresh run only if the dip is still there.
_Avoid_: follow-up run, poll

**Session log**:
The append-only record of one demo session around its runs: triggers, dips opening and closing, clock advances and notices.
_Avoid_: demo log, event log
