---
type: verification-report
stage: 04_verify
unit: supabase-postgres-authenticated-trace-resolution-parity
status: proposed
verdict: passed-with-limitations
truth_mode: TEST
target_project_ref: tonuxepirauyqcwbwenw
---

# Supabase trace-resolution verification report

## Verdict

The accepted Supabase PostgreSQL slice satisfies its TEST parity promise for
authenticated, tenant-bound, read-only trace resolution. It is suitable for an
evaluator-facing TEST proof after the disclosed limits below remain visible.
It does not yet support removing D1 or claiming a deployed Supabase runtime.

## Resolved criteria

| Criterion | Result | Evidence |
|---|---|---|
| Provider behavior | Passed | Local route and adapter tests select exactly one `d1` or `supabase` provider, validate the transaction-pooler endpoint, and never fall back after a Supabase failure. |
| Hosted data parity | Passed | The Supabase connector returned 2 workspaces, 2 workspace members, 2 traces, and 77 events. The accepted fixture digest remains bound in Stage 03 evidence. |
| Tenant A isolation | Passed | Under `cfr_trace_reader`, tenant A returned 28 own events, 0 foreign traces, and 0 foreign events. |
| Tenant B isolation | Passed | Under `cfr_trace_reader`, tenant B returned 49 own events, 0 foreign traces, and 0 foreign events. |
| Missing context | Passed | The hosted reader result was `visible_without_context: 0`. |
| Read-only authority | Passed | Hosted privilege inspection returned `all_select_granted: true`, `any_insert_granted: false`, `any_update_granted: false`, and `any_delete_granted: false`. Stage 03 transactional tests also rejected direct mutation. |
| Trace integrity | Passed | Accepted hosted tests rejected sequence gaps, invalid transitions, foreign trace subjects, and event mutation; all test mutations rolled back. |
| Adapter fidelity | Passed | A short-lived reader login exercised the actual adapter through Supavisor and returned 28/49 events with cross-tenant `not_found`. |
| Rollback | Passed | D1 remains the rollback path through explicit provider selection, and the 63-test suite exercises the existing D1 route behavior. There is no automatic cross-provider fallback. |
| Secret hygiene | Passed | The hosted probe role is absent, the temporary probe files are absent, fixture generation is secret-free, and no connection secret is present in bound evidence. |
| Hosted advisors | Passed | The current connector returned zero security advisories and five `Unused Index` INFO notices. It returned no warning-level RLS or foreign-key finding. |
| Build quality | Passed | The focused 63-test suite, lint, production build, Stage 04 verifier, and diff inspection pass. |

## Current hosted observations

The project-scoped Supabase connector returned these read-only observations on
2026-09-08:

```json
{"workspaces":2,"workspace_members":2,"traces":2,"events":77,"probe_removed":true}
```

```json
{"tenant_a":{"own_events":28,"foreign_traces":0,"foreign_events":0},"tenant_b":{"own_events":49,"foreign_traces":0,"foreign_events":0}}
```

```json
{"visible_without_context":0,"all_select_granted":true,"any_insert_granted":false,"any_update_granted":false,"any_delete_granted":false}
```

The current security-advisor result is empty. The performance advisor reports
five `Unused Index` INFO notices on the small fresh TEST dataset. Supabase's
remediation reference is
<https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index>.

## Limits and release claims

- This is TEST evidence. No production data, LIVE external effect, or deployed
  Supabase-backed route was exercised.
- No persistent least-privilege runtime credential or deployment secret exists.
- The four-table slice does not preserve full non-trace subject binding or the
  complete write-authority model, so D1 cannot be removed.
- The Supabase migration ledger is empty because the three repository
  migrations were applied through SQL Editor. The schema and fixture are
  verified, but this project cannot be presented as proof of automated or
  ledger-tracked migration deployment.
- Unused-index INFO notices may be reassessed after representative traffic;
  removing integrity or tenant-query indexes from this tiny fixture would not
  be justified by the current observation alone.

These limits block claims of production readiness, complete D1 replacement,
automated migration delivery, or exactly-once behavior. They do not block the
bounded TEST parity claim above.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/04_verify/CONTEXT.md` | `620f3b24cb8f9722a2802ff3195f449b681b97f7f3e8c62e1f9fa773b5f6e2fa` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `fd78d61f7d54762359fb164b6ee5a0a4497a6ad7322d06a5028fa748b39b9050` |
| `factory/03_build/output/HUMAN_GATE.md` | `5163d553740de8884e89aa4029426649cf01fc60411ae0cb453a09543682e1db` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
