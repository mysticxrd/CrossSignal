# One model-driven loop: code owns the clock, caps and proposal, never the order of the investigation

An E1 run is one agent loop. It opens with the alert alone, the same input the checklist baseline starts from, and from there the model chooses every read through native tool calls until it calls `propose`. Code owns everything that is not judgement: the world clock, the call and spending caps, proposal validation, pricing, execution and grading. Code never forces an order of investigation steps. Those steps (read signals, candidate causes, test the lookalike, price, propose) are labelled on the run log afterwards, for the transition failure matrix. There is no memory between runs, and the full history stays in context with no compaction. We chose this because E1's claim is that an agent tells lookalike causes apart better than a checklist. If code ordered the steps or made the opening reads, the eval would measure our workflow and hand the agent the checklist's first move. With no memory, the three runs of pass^3 stay independent and held-out cases are spent once.

## Considered options

- **A fixed workflow with a model call per step**: easier to debug, but the transition matrix would describe the workflow's order, not the agent's choices.
- **A hybrid where code makes the opening reads**: cheaper by a turn, but it inflates evidence coverage and hides selection, the first thing section 3 measures.
- **Steps declared by the agent each turn**: a prompt nudge that structures reasoning (itself a harness change), and declarations can differ from what the agent does.
- **Memory between runs**: runs of one case or one batch would depend on each other, and lessons learned during the held-out batch would leak into it.

## Consequences

- Compaction, a working-state note, a stopping rule and subagents are each one later harness change, measured on development cases. Each is justified only by a failure mode found in run logs (for context: evidence coverage high but runs failing, in long runs).
- Because the agent cannot write (ADR 0003) and reads a frozen world, a crashed run restarts from scratch. Only the executor needs intent-based recovery.
- Mid-run questions to a person would reopen this decision. In eval runs there is no simulated person.
