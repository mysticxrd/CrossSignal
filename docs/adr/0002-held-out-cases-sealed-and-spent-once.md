# Held-out cases are written by Codex, sealed, and spent once

Claude builds the E1 agent and the checklist baseline, so Claude never sees held-out cases: Codex chooses their injection settings (within documented bounds it picks, not Claude's development ranges) and writes their customer messages from its own bank, and the set is sealed by hash with the `heldout-670` commit-then-reveal mechanism. The owner, who does not build the agent, solves them from records alone for world gate 3. The set is revealed once: every harness rung to be claimed is named and frozen first, all run on it together, and only then are per-case results read; afterwards it counts as development data and a new claim needs a new sealed batch.

## Considered options

- **The owner writes the injection settings**: clean, but costs the owner's time on every batch.
- **Claude writes everything**: the agent's prompt would be tuned on the same author's phrasing and parameter ranges, so a held-out score would overstate how the agent generalises.

## Consequences

- Section 10's harness ladder must name its rungs before the reveal; a rung added afterwards is measured on development cases only.
- A held-out message that appears in the development bank fails the set, as `copied-message` does for #670.
- The pass rule, case counts, floors and win test are written in one pre-registration file whose hash goes into the commit that seals the set; a result that misses the bar is reported as missing it.
