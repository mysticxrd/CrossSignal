---
type: stage-output
stage: 05_ship
status: ready-for-review
unit: persisted-graph-executor-correction
---

# CrossSignal cold reviewer script

This walkthrough demonstrates a fixed six-node graph whose handlers execute at
runtime and persist their attempts and artifacts. The handler inputs and all
business evidence are `FIXTURE`; the email adapter is `TEST`. Runtime execution
does not make the evidence live, and the observed outcome is correlated, not
proven. No blind retry is permitted after an ambiguous dispatch.

## Cold setup

Use Node.js 22.13 or newer from the repository root:

```bash
npm install
npm run demo:prepare
npm run dev
```

Open `http://localhost:3000/`. `demo:prepare` only applies checked-in migrations
to the local D1 database; it is idempotent and does not seed successful graph
rows. If no local workspace exists, create the prefilled **Atlas Foundry**
workspace. Loading the workspace then creates the frozen context and invokes the
product-owned persisted graph executor.

If a completed trace is already present, open **Outcome** and choose **Reset
exact FIXTURE trace for replay**. The reset removes only the exact demo trace;
it preserves workspace membership and the Global Pause setting. The next load
recreates the context and runs the graph through the runtime executor.

## Reviewer walkthrough

1. On **Action control**, confirm the page labels the evidence `FIXTURE`, the
   exact email preview `TEST`, and the proposed action **NOT AUTHORIZED**. The
   reviewed playbook must contain six completed durable nodes, including the
   skeptic, before an intent is available.
2. Expand **Inspect playbook proof**. The UI reports six durable nodes over one
   frozen five-source snapshot. The release verification independently proves
   these are `runtime` attempts for `crosssignal-fixed-graph-v1`, not seeded
   success rows; the underlying evidence remains `FIXTURE`.
3. Choose **Pause all actions**. Confirm the page says new actions are paused
   and that **Authorize exact action** is disabled. Resume actions before the
   next step.
4. Choose **Edit proposed action**, change the subject, and select **Save as new
   intent**. Confirm the intent version advances and the page still says **NOT
   AUTHORIZED**. This demonstrates that a mutation creates a new immutable
   proposal instead of inheriting authority.
5. In **DEMO EXECUTION RESULT**, select **Provider times out after dispatch**,
   then choose **Authorize exact action**. Confirm the terminal banner reads
   **INDETERMINATE · NO RETRY**. Open **Narrative trace** and inspect the
   execution detail: attempt count is one and blind retry count is zero.
6. Open **Outcome**, choose **Reset exact FIXTURE trace for replay**, return to
   **Action control**, leave **Provider confirms** selected, and choose
   **Authorize exact action**.
7. Open **Narrative trace**. Copy the displayed trace ID and expand **Inspect
   trace proof** to see the context, intent, and policy hashes. The narrative
   separates evidence, skeptic challenge, proposal, human authorization, TEST
   execution, and outcome.
8. Open **Outcome**. Confirm the result says **Correlated, not proven** and that
   `Proven` remains **NO CLAIM**.

## What the cold run establishes

- The product calls the fixed graph executor and persists six runtime attempts
  and six canonical artifacts before creating one intent and one policy.
- Exact human authority remains downstream of synthesis; graph execution alone
  creates no grant, effect, observation, or assessment.
- Completed work is resumable and expired claims retain a failed attempt before
  a later attempt succeeds; these schedules are independently exercised by
  `npm run verify:ship`.
- `FIXTURE` evidence, a `TEST` effect, unknown measured cost, and the absence of
  causal proof remain explicit throughout the release.

## 90-second narrative

**0–15 seconds:** “CrossSignal is a human control layer for consequential agent
actions. This is a standalone portfolio project. The business evidence is
FIXTURE and the provider is TEST.”

**15–35 seconds:** “Before this proposal appears, the product executes a fixed
planner, three workers, skeptic, and synthesizer graph. Each node has a durable
runtime attempt and content-addressed artifact over one frozen context. It is a
bounded sequential graph, not a generic agent platform.”

**35–55 seconds:** “The graph may propose this exact action, but it cannot
authorize it. Editing creates a new immutable intent, Global Pause blocks new
effects, and approval binds the displayed recipients, payload, context, policy,
nonce, expiry, and spending cap.”

**55–75 seconds:** “An ambiguous post-dispatch result becomes INDETERMINATE · NO
RETRY. CrossSignal records uncertainty instead of inventing success or silently
replaying a potentially completed write.”

**75–90 seconds:** “A confirmed TEST effect can be followed by a recorded
FIXTURE outcome, but the claim remains correlated, not proven. The trace keeps
evidence, reasoning, authority, effect, and outcome inspectable under one
identity.”

## Stop conditions

Stop and record a failure if migration preparation requires manual repair, the
playbook has fewer than six completed nodes, the action is already authorized
after reset, a paused workspace can authorize, an indeterminate action retries,
truth labels disappear, or the outcome claims causality.
