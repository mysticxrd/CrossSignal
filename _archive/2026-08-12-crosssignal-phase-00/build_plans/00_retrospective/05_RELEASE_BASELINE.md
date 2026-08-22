---
id: phase-00-retrospective-gate-05
historical_gate: P00-M5
classification: retrospective-owner-visibility
---

# Gate 5 — Release baseline

## 1. Gate purpose

This gate had to answer: **Is there one reproducible, privately deployed Phase 00
baseline whose persisted behavior and limitations match its claims?** It mattered
because passing local checks did not prove that D1 migrations worked on the
hosting platform, that the deployed URL was owner-only, or that refresh and
workspace switching preserved isolated state.

## 2. Starting situation

The earlier gates had a truthful demo profile, hardened schema, architecture
records, and a local EVE spike. Deployment privacy and exact source were still
unproved. The existing “scan” was actually a client-triggered D1 fixture-cycle
reset, and its safe scope needed a precise contract. Test counts had changed as
Phase 00 grew and could be mistaken for PRD eval results.

## 3. What was decided

The release baseline would contain only the Sites/Vinext application and D1
migrations; the local EVE spike would stay outside the package. Reset would be
an additive operation over the authenticated owner's current workspace, case
`CS-014`, and current cycle. It would preserve earlier events, approvals,
evidence, and other workspaces and issue no deletion. The release would report
exactly 12 structural/database/contract tests—not claim that PRD evals passed.

The selected deployment remained owner-only. The rejected alternatives were a
destructive “clean slate” reset, treating a browser reset as authoritative,
shipping the EVE spike as if connected, converting the test denominator into an
eval claim, or replacing the prior deployment after a failed migration. The
technical release record and commits were authored by `mysticxrd`; there is no
separate owner acceptance record for closing this gate.

## 4. What was implemented

The reset path appends a `case_reset` event and advances one guarded case cycle
inside D1 without `DELETE`. A test inspects that boundary. Build, targeted lint,
fresh/upgrade migrations, integrity checks, tenant attacks, truthfulness
contracts, architecture contracts, spike type-check, and the restart verifier
were recorded as passing.

Sites version 5 failed before release because D1 rejected the original tenant
migration. The prior live version was retained. After the D1-safe migration
correction, version 6 from commit `a1e7dde` deployed successfully. The stored
browser verification says the authenticated owner refreshed Atlas Foundry,
created an isolated second workspace, switched between them, and recovered each
workspace's distinct stage and cycle without console errors.

## 5. How CrossSignal changed

- **User-visible:** the owner received a private, truthful foundation deployment
  with durable workspace switching, refresh behavior, and locally disclosed fixtures.
- **System-level:** migration behavior was corrected against real D1, the reset
  boundary became explicit, and the source/archive/deployment identifiers were recorded.
- **Unchanged:** there was still no product ICM repository, EVE integration,
  live connector, detector, external action, calculated outcome, or PRD eval suite.

## 6. Evidence

- Reset: [`RESET_CONTRACT.md`](../00_evidence/P00_M5/RESET_CONTRACT.md),
  [`cases.ts`](../../db/cases.ts), and [`case-actions.ts`](../../app/case-actions.ts)
- Full checks and migration failure: [`BASELINE_VERIFICATION.md`](../00_evidence/P00_M5/BASELINE_VERIFICATION.md)
- Deployment identity and browser proof: [`PRIVATE_DEPLOYMENT.md`](../00_evidence/P00_M5/PRIVATE_DEPLOYMENT.md)
- Non-claims: [`KNOWN_LIMITATIONS.md`](../00_evidence/P00_M5/KNOWN_LIMITATIONS.md)
- Gate summary: [`ACCEPTANCE_EVIDENCE.md`](../00_evidence/P00_M5/ACCEPTANCE_EVIDENCE.md)
- Executable suite: [`rendered-html.test.mjs`](../../tests/rendered-html.test.mjs)
- Git: `e19331e` established the baseline contract; `a1e7dde` fixed the D1
  migration; `a341e0c` closed Phase 00 with deployment evidence.

## 7. Truthfulness classification

The reset mutation, D1 data, migration correction, Sites version-6 deployment,
authenticated refresh/switch observations, and 12-test denominator are recorded
as **real**. The source records, hypotheses, receipt label, implementation, and
outcome are **fixtures**. The 14-day advance is **simulated time**. No sandbox
external effect existed. EVE product runtime, ICM, live providers, calculated
measurement, public Lab, and PRD eval completion remained **planned**.

## 8. Limitations and risks

The deployment proof is a dated repository record, not a current availability
check; this retrospective intentionally did not redeploy. The second workspace
used the same authenticated owner, so the live browser exercise did not prove a
real second user's hosting-session isolation. The reset is additive but not a
fully idempotent golden-workspace reset. Accessibility, performance targets,
long-term retention, deletion, and full end-to-end recovery were not proven.

## 9. What the owner should understand

Phase 00 ended with a real private foundation deployment, not the CrossSignal
decision loop promised by the PRD. The failed version-5 attempt was preserved
and corrected rather than hidden. Revisit hosting privacy, reset semantics,
platform-real migration coverage, and the release gate before any broader demo
or live-data use.
