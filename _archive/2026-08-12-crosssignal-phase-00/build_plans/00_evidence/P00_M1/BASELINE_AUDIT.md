---
id: p00-m1-baseline-audit-2026-08-11
commit: e9211dc
audit_date: 2026-08-11
status: complete
---

# Phase 00 baseline audit

## Repository state

- Branch: `master`
- Audited planning commit: `e9211dc — Add phased CrossSignal build plans`
- Working tree before Phase 00 work: clean
- Runtime: Node.js `v22.15.0`, satisfying `>=22.13.0`
- Deployment declaration: Sites project `appgprj_6a79fe6419348191839f520df5792738`
  with logical D1 binding `DB` and no R2 binding
- Exact live deployment/privacy state: not provable from repository files; a
  hosted verification receipt remains P00-M5 work

## Baseline claims compared with code

| Documented baseline | Audit result | Inspectable source |
|---|---|---|
| Sites-authenticated owner with development fallback | Matches | `app/crosssignal-auth.ts`, `app/chatgpt-auth.ts` |
| Multiple owner workspaces and server-side membership checks | Matches current paths; adversarial matrix is missing | `app/page.tsx`, `app/workspace-actions.ts`, `db/workspaces.ts` |
| D1/Drizzle users, workspaces, cases, approvals, events, evidence, hashes, migrations | Matches | `db/schema.ts`, `drizzle/0000_*.sql` through `0002_*.sql` |
| Persisted seeded case loop and cockpit | Matches | `db/cases.ts`, `app/CrossSignalApp.tsx` |
| Four structural/database tests | Matches and passes | `tests/rendered-html.test.mjs` |
| Runtime DDL duplicates checked-in migrations | Matches known gap | `db/workspaces.ts`, `db/cases.ts` |
| Complete tenant-isolation matrix absent | Matches known gap | Current tests assert patterns and limited SQLite constraints only |
| Source/action/outcome/Lab/eval presentation is illustrative | Matches, but wider than the plan's examples | `CLAIM_REGISTER.md` |

## Contradictions and evidence gaps

1. `README.md` still calls this an empty starter and says `db/schema.ts` is
   intentionally empty. The implementation has three durable migrations and a
   product schema. README correction is required in Phase 00.
2. The UI globally says synthetic data, but several local surfaces still use
   live-sounding freshness, health, schedule, EVE run, external receipt,
   Company Brain, publication, and eval wording. P00-M1 relabels these locally.
3. “Every read and write” isolation is not yet proven. Membership checks exist,
   but cross-table workspace integrity is not encoded by composite constraints
   and the two-user/two-workspace matrix is absent. This remains P00-M2 work.
4. Checked-in migrations and runtime `CREATE TABLE IF NOT EXISTS` blocks have
   two owners and can drift. This remains P00-M2 work.
5. The configured Sites project and built hosting manifest prove deployment
   intent, not that the currently deployed URL is private and running this
   commit. This remains P00-M5 evidence.

## Untouched-baseline verification

On 2026-08-11, `npm.cmd test` completed the Vinext production build and all four
Node tests passed (`4 passed, 0 failed`). The sandboxed first attempt could not
write Vite's temporary cache under `node_modules`; rerunning the same command in
the approved host execution surface passed and exposed no code failure.

The pre-existing lint command was not used as acceptance proof because its
repository-wide scan did not terminate promptly. P00-M1 uses a targeted lint
over the changed application/database/test surfaces and records its result in
`ACCEPTANCE_EVIDENCE.md`.
