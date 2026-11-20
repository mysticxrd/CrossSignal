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
A case's correct cause, affected orders, rupee impact and kind of action, fixed when the case is made and before any run.
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
