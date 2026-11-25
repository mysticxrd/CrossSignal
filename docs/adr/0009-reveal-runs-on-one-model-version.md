# The reveal runs every rung on one model version, and practice decides how it is paid for

A model version is the provider, the model id and the build the provider reports; a change in any of them is a different model. One reveal runs every rung of the harness ladder on the held-out cases on one model version, and that version is the one the gate batch (the last practice batch, which checks the development pass^3 bar) ran on. Before the reveal starts, reveal admission checks that the money left covers every rung's runs at planning cost; a reveal that would not fit does not start. If the model version changes part-way, for example because the provider retires the model id, as Nebius retired `DeepSeek-V4.1-Flash` on 9 Nov 2026 with no reroute, the whole reveal is void and every rung reruns on one new version; rungs are never mixed across versions. Practice (the probe and development batches 1-4) runs on Nebius's `DeepSeek-V4.1-Flash-1017`; at the decision point after it, the owner chooses whether the reveal is paid for by refilling Nebius or by moving agent runs to the Command Code GOAT plan, which then needs its own probe, a stable-build check and a rerun of the gate batch on GOAT. We chose this because held-out cases are spent once (ADR 0002): a rung difference measured across two builds could be the build, not the harness, and the cases cannot be run again to find out. GOAT's "DeepSeek V4.1 Flash (latest)" is an alias routed through gateways to inference providers it does not name, so unless a response names a stable upstream build, GOAT can host practice but never a reveal.

## Considered options

- **Nebius until the $25 credit runs out, then GOAT** (section 2's plan): the switch could land mid-reveal, and the gate batch would have measured a different model from the one revealed.
- **Development batches 1-3 on GOAT, everything the reveal depends on on Nebius** (round 3's Plan A): it fit under $25 before the judge moved to Nebius; the owner chose to practise on the reveal's own model first and decide the money afterwards.
- **A bridging rung re-run on both versions**: it costs a rung's held-out runs twice and still spends the cases on two models.

## Consequences

- The provider is part of the model version, so a provider switch is a `model_version_changed`, never a silent swap.
- A version change during a reveal costs one full rerun of the reveal (about $25 at planning cost, about $9 expected), which is why reveal admission runs first.
- The summary-faithfulness judge is not part of the model version: its model belongs to the grader version (ADR 0006), and changing it re-judges stored run logs without re-running the agent.
- Choosing GOAT at the decision point adds about 48 runs (the gate batch rerun) before the reveal.
