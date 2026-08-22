---
type: stage-contract
stage: 03
job: build-one-durable-vertical-slice
---

# 03_build - close one bounded product loop

One job: implement the accepted onboarding-rescue slice against the accepted
specification and data package.

## Inputs

- Working specification: `../01_spec/output/SPEC.md`
- Working: `../02_data/output/DATA_PACKAGE.md`
- Working verification: `../02_data/output/VERIFY.md`
- Working gate: `../02_data/output/HUMAN_GATE.md`
- Reference: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Reference: `../_shared/QUALITY_GATES.md`
- Durable product: `../../app/`, `../../db/`, `../../drizzle/`, `../../worker/`, `../../tests/`

Do not load: `_archive/`, later stages, speculative connectors, or unrelated
source-vault pages.

## Process

1. Implement the fixed planner, workers, skeptic, and synthesizer over one frozen snapshot.
2. Persist evidence, intent, policy, exact approval, effect attempt, observation, assessment, and trace.
3. Expose only the timeline, approval inbox, trace inspector, and outcome view required by Spec.
4. Add `npm run verify:build`, capture one replayable trace, and stop.

## Outputs

- Accepted implementation changes in the durable product tree
- `output/BUILD_EVIDENCE.md` - preview, trace ID, artifact links, screenshots, and limits
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `npm run verify:build`, `npm run build`, `npm run lint`, and `npm test`.
The preview must complete the golden path without hidden repair and reconstruct
context -> graph -> intent -> policy -> approval -> effect -> observation.

## Human gate

Run the golden path and edit the proposed action before approval. Accept only
if the visible loop matches Spec and a mutation creates a new intent.

## Failure routing

Data defects return to Stage 02. Implementation defects remain here. Never
weaken an accepted contract or truth label to make the path pass.
