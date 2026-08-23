---
type: stage-contract
stage: 01
job: specify-one-result-relevant-product-slice
---

# 01_spec - decide what to build

One job: turn the owner's goal and the current product baseline into one
bounded, evidence-backed, testable build specification.

## Inputs

- Reference: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Reference: `../_shared/QUALITY_GATES.md`
- Working baseline: `../../README.md`, `../../package.json`
- Working baseline: `../../app/`, `../../db/`, `../../drizzle/`, `../../tests/`
- External during this stage only: Result's public website, public thesis, YC
  profile, and Lab. Record URLs and retrieval dates; separate facts from
  inferences.

Do not load: `_archive/`, the source Obsidian vault, later stages, dependency
folders, or generated build output.

## Process

1. Establish the Result relationship and adjacent product wedge from public evidence.
2. Define one primary user, problem, golden path, truth boundary, and visible surface.
3. Fix scope, non-goals, repository gaps, and observable acceptance criteria.
4. Write `SPEC.md`, add `npm run verify:spec`, verify it, and stop.

## Outputs

- `output/SPEC.md` - the canonical editable product specification for this run
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `npm run verify:spec`, `npm run build`, `npm run lint`, and `npm test`.
Fail on missing public evidence, invented Result claims, vague acceptance
criteria, hidden implementation gaps, secret patterns, or scope contradictions.

## Human gate

Read the specification as the product owner. Accept only if its relationship to
Result, primary user, golden path, scope, truth labels, and observable definition
of done match the product you want to build.

## Failure routing

Edit `SPEC.md` or its approved source. Do not move ambiguity into Data or Build.
