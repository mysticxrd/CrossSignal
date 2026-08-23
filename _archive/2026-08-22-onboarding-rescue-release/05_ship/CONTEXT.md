---
type: stage-contract
stage: 05
job: ship-evaluator-ready-proof
---

# 05_ship - make the verified proof portable

One job: turn accepted verification evidence into a truthful release that a new
reviewer can run without coaching or hidden repair.

## Inputs

- Working specification: `../01_spec/output/SPEC.md`
- Working: `../04_verify/output/VERIFICATION_REPORT.md`
- Working verification: `../04_verify/output/VERIFY.md`
- Working gate: `../04_verify/output/HUMAN_GATE.md`
- Golden trace: `../03_build/output/BUILD_EVIDENCE.md`
- Reference: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Reference: `../_shared/QUALITY_GATES.md`
- Product handoff: `../../README.md`, durable code, migrations, tests, and preview

Do not load: `_archive/`, unrelated vault pages, or unverified production claims.

## Process

1. Create a clean reset and proof view around the accepted golden trace.
2. Package release identity, architecture, threats, truth manifest, verification evidence, setup, and a 90-second narrative.
3. Run the release cold with a new reviewer and treat misunderstandings as defects.
4. Add `npm run verify:ship`, capture final evidence, and stop.

## Outputs

- `output/RELEASE_MANIFEST.md` - release identity and links to every proof
- `output/DEMO_SCRIPT.md` - truthful 90-second reviewer narrative
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `npm run verify:ship`, `npm run build`, `npm run lint`, and `npm test`.
A fresh reviewer must reset, run, approve, inspect, and replay the failure case;
every claim resolves to an artifact, trace, receipt, test, or labeled fixture.

## Human gate

Run the release from its written instructions. Accept only if scope, truth mode,
authority, failure behavior, and outcome are clear without oral correction.

## Failure routing

Presentation defects remain here. Product, data, build, or verification defects
reopen their owning stage and make this release stale.
