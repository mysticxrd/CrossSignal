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
A fall in store revenue that crosses the alert threshold.
_Avoid_: drop, incident, anomaly

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
The agent's final answer in a run: the cause it names, the records it cites and the effects it asks for; nothing in the world changes until a person approves it.
_Avoid_: recommendation, action plan, finding

**Effect**:
One change to the world a proposal asks for, such as capturing payments or rolling back a deploy, applied by code only after approval.
_Avoid_: action, write, fix

**Toolset version**:
One pinned, hashed edition of everything the agent's tools show it (names, descriptions, shapes and limits); changing any part of it is a harness change.
_Avoid_: tool config, tool schema

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
Everything a run read, called and proposed, in order; what evals and error analysis read.
_Avoid_: trace, transcript

**Pass**:
A run that names the right cause and kind of action, prices recoverable rupees within tolerance, proposes nothing unsafe and loses no rupees by its own waiting.
_Avoid_: success, correct answer

**pass^3**:
The share of cases where all three runs pass.
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
