---
type: demo-script
stage: 05
status: ready-for-review
release_id: crosssignal-onboarding-rescue-evaluator-v1
trace_id: trace_d12fc25947ed88cd
truth_mode: FIXTURE
effect_mode: TEST
target_duration_seconds: 90
---

# CrossSignal cold reviewer script

This script is self-contained. It uses FIXTURE evidence and a TEST email
adapter, sends no live email, makes no causal claim, and claims no private
Result integration. Stop if the screen does not show FIXTURE and TEST labels.

## Cold preparation

From the repository root:

```bash
npm install
npm run demo:prepare
npm run dev
```

Open `http://localhost:3000/`.

If a completed result is visible:

1. Choose **Outcome**.
2. Choose **Reset exact FIXTURE trace for replay**.
3. Return to **Action control** if the reset does not return automatically.

Expected start: **Waiting for you**, **NOT AUTHORIZED**, three `.example.test`
recipients, a `$0.15` cap, a TEST message preview, and Global Pause beside the
authorization card.

## Cold reviewer walkthrough

Run this once without relying on the 90-second talk track:

1. Engage **Pause all actions**. Confirm the page says all agent actions are
   paused and **Authorize exact action** is disabled. Resume actions.
2. Choose **Edit proposed action**, change the subject, and choose **Save as
   new intent**. Confirm Intent v2 is still **NOT AUTHORIZED**.
3. Under **DEMO EXECUTION RESULT**, select **Provider times out after
   dispatch**. Choose **Authorize exact action**.
4. Inspect the control result: `INDETERMINATE · NO RETRY`, the provider-timeout
   reason, and no success language. Open **Narrative trace** and confirm the
   last business stage says **NO CLAIM**.
5. Choose **Outcome**, then **Reset exact FIXTURE trace for replay**.
6. Review the exact default action again. Leave **Provider confirms** selected
   and choose **Authorize exact action**.
7. Open **Narrative trace**. Read the story in this order: evidence used →
   skeptic review → proposed action → human authorization → execution result →
   observed business outcome. Open one **View details** disclosure.
8. Open **Outcome**. Confirm Observed and Correlated say yes, Proven says
   **NO CLAIM**, and the headline is **Correlated, not proven**.
9. Reload the page. Confirm the exact authorization and confirmed TEST effect
   remain reconstructed from the same trace.

No blind or silent retry should occur in either failure branch.

## 90-second narrative

### 0–10 seconds — frame the product

Say:

> CrossSignal is not primarily an audit log. It is a human control layer for
> consequential agent actions.

Show **Action control**. Point to FIXTURE and TEST.

### 10–25 seconds — control before action

Point to the exact email, all three recipients, and the `$0.15` cap.

Say:

> Before this TEST action can run, the owner sees exactly what would be sent,
> to whom, and the maximum cost. Nothing happens until the owner authorizes
> this exact scope.

Open **View technical proof** briefly, then close it. Explain that hashes,
policy, IDs, and expiry are available without leading the decision.

### 25–35 seconds — control during operation

Engage **Pause all actions**.

Say:

> Global Pause immediately blocks every new effect reservation, and the server
> checks it again immediately before dispatch.

Point to the disabled authorization control, then resume.

### 35–50 seconds — honest ambiguous execution

With **Provider times out after dispatch** selected, choose **Authorize exact
action**.

Say:

> The TEST provider became ambiguous after possible dispatch. CrossSignal
> stops, records `INDETERMINATE · NO RETRY`, and never pretends the action
> failed or succeeded.

### 50–65 seconds — readable narrative

Open **Narrative trace**.

Say:

> The record reads as a human story: evidence, skeptic review, proposal, exact
> authorization, execution, and outcome. Here the execution is uncertain, so
> no business outcome is claimed.

### 65–80 seconds — confirmed replay

Use **Outcome** → **Reset exact FIXTURE trace for replay**. Return to the exact
proposal, leave **Provider confirms** selected, and authorize it.

Say:

> Reset is narrow and labeled. A fresh exact authorization creates one
> confirmed TEST effect; it does not reuse the ambiguous attempt.

### 80–90 seconds — calibrated outcome

Open **Outcome**.

Say:

> One FIXTURE account activated afterward. That is observed and correlated,
> not proven to have been caused by the action. CrossSignal preserves that
> distinction instead of upgrading provenance into causality.

End on **Correlated, not proven**.

## Reviewer checkpoints

- If authorization is enabled while Global Pause is engaged, stop: the release
  fails.
- If Intent v2 inherits authorization from Intent v1, stop: the release fails.
- If the timeout branch retries, claims success, or shows a business outcome,
  stop: the release fails.
- If the confirmed branch says Proven, stop: the release fails.
- If FIXTURE or TEST labeling disappears, stop: the release fails.
- Do not treat this single-user walkthrough as visual proof of tenant
  isolation; use the linked written verification.
