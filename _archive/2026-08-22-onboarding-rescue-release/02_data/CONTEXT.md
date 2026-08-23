---
type: stage-contract
stage: 02
job: make-the-accepted-specification-executable-as-data
---

# 02_data - make the product contracts executable

One job: turn the accepted product specification into tenant-safe schemas,
state machines, migrations, validators, provenance, and a canonical fixture.

## Inputs

- Working: `../01_spec/output/SPEC.md`
- Working verification: `../01_spec/output/VERIFY.md`
- Working gate: `../01_spec/output/HUMAN_GATE.md`
- Reference: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Reference: `../_shared/QUALITY_GATES.md`
- Product data surface: `../../db/schema.ts`, `../../db/`, `../../drizzle/`,
  `../../app/*-types.ts`, `../../tests/`
- Tooling: `../../drizzle.config.ts`, `../../package.json`,
  `../../package-lock.json`, `../../.gitattributes`

Do not load: `_archive/`, later stages, undeclared vault pages, UI styling, or
the whole repository.

## Process

1. Define entities, tenant ownership, identities, provenance, hashes, and retention.
2. Define valid transitions for context, graph, intent, policy, approval, action, outcome, and trace.
3. Implement migrations, shared validators, negative contract tests, one golden fixture, and reset semantics.
4. Add `npm run verify:data`, write the data package manifest, and stop.

## Outputs

- Durable schemas, migrations, validators, fixtures, and tests in product paths
- `output/DATA_PACKAGE.md` - canonical manifest and state diagrams
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `npm run verify:data`, `npm run build`, `npm run lint`, and `npm test`.
Reject invalid schemas, unresolved hashes, impossible transitions, cross-tenant
references, undeclared fixture truth, and mutated, stale, or replayed authority.

## Human gate

Inspect the golden fixture from evidence through outcome. Accept only if every
record is owned, reconstructable, and honest, while unauthorized paths fail closed.

## Failure routing

Change Spec if product behavior is wrong. Otherwise correct Data; do not hide a
contract defect in Build.
