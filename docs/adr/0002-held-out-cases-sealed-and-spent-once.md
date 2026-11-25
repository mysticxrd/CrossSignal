# Held-out cases are written by Codex, sealed, and spent once

Claude builds the E1 agent and the checklist baseline, so Claude never sees held-out cases: Codex chooses their injection settings (within documented bounds it picks, not Claude's development ranges) and writes their customer messages from its own bank, and the set is sealed by hash with the `heldout-670` commit-then-reveal mechanism. The owner, who does not build the agent, solves them from records alone for world gate 3. The set is revealed once: every harness rung to be claimed is named and frozen first, all run on it together, and only then are per-case results read; afterwards it counts as development data and a new claim needs a new sealed batch.

## Considered options

- **The owner writes the injection settings**: clean, but costs the owner's time on every batch.
- **Claude writes everything**: the agent's prompt would be tuned on the same author's phrasing and parameter ranges, so a held-out score would overstate how the agent generalises.

## Consequences

- Section 10's harness ladder must name its rungs before the reveal; a rung added afterwards is measured on development cases only.
- A held-out message that appears in the development bank fails the set, as `copied-message` does for #670.
- The pass rule, case counts, floors and win test are written in one pre-registration file whose hash goes into the commit that seals the set; a result that misses the bar is reported as missing it.

## Addendum, 2026-11-23: void runs

A run stopped by something outside the agent and its harness is void, not failed: the provider failing after its bounded retries, the spend ceiling, the model version changing mid-run, or a broken reservation bound. A void run restarts once from scratch on the same case, and its run log is kept. A case with a second void is reported as not scored, never as a pass. Crashes of our own harness, timeouts and malformed output still fail. This rule goes in the pre-registration, so an outage during the reveal neither spends held-out cases nor invites an unregistered rerun.

## Addendum, 2026-11-25: the harness ladder

The ladder spends the held-out set once, so its shape is fixed before sealing:
- **Rung 0** is section 4's harness plus every practice fix, frozen when development batch 2 ends. Fixes are measured on development cases only.
- **Each rung above it** is the rung below plus exactly one harness change. A candidate joins only if it is kept on development cases by a rule written before its batch.
- **The claim rung**, the top rung, is named in the pre-registration and is the only rung section 2's win test runs on. If reveal admission cannot cover every rung, rungs are cut from the top before sealing.
- **Held-out comparisons** between rungs are two-sided and Holm-corrected, and read as better, worse or inconclusive; no rung is chosen after the reveal.
