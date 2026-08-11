---
id: p00-m2-tenant-isolation-matrix
actors: [user-1, user-2]
workspaces: [ws-1, ws-2]
status: passed
---

# Two-user / two-workspace isolation matrix

The executable matrix lives in `../../../tests/rendered-html.test.mjs`. Each
owner has exactly one membership and each workspace has its own case and
evidence row.

| Boundary | Crafted input | Enforcement | Expected / observed |
|---|---|---|---|
| Workspace cookie | `foreign-ws`, 129-character value, missing value | Authorized-list selector | Falls back to `user-1`'s first authorized workspace; never selects foreign data — pass |
| Workspace switching | `user-1` supplies a workspace ID | Server membership query before cookie write | Only an owned workspace can be selected — covered by source assertion and selector test |
| Case creator | `case.workspace_id=ws-1`, `created_by=user-2` | Composite membership FK | Insert rejected — pass |
| Evidence creator | `evidence.workspace_id=ws-1`, `created_by=user-2` | Composite membership FK | Insert rejected — pass |
| Case/evidence link | `case-1@ws-1` with `ev-2@ws-2` | Composite case and evidence FKs | Insert rejected — pass |
| Case event workspace | `case-1@ws-1` with `event.workspace_id=ws-2` | Composite workspace/case FK | Insert rejected — pass |
| Case event actor | `event@ws-1`, `actor_user_id=user-2` | Composite membership FK | Insert rejected — pass |
| Approval workspace | `case-1@ws-1` with `approval.workspace_id=ws-2` | Composite workspace/case FK | Insert rejected — pass |
| Approval actor | `approval@ws-1`, `approved_by=user-2` | Composite membership FK | Insert rejected — pass |
| Read path | Foreign workspace ID supplied to case flow | Membership check before case lookup | No foreign case/evidence/event read path is reached — source contract retained |

After every attempted mutation, the database still contains exactly two valid
cases, zero approvals, and no rows reported by `PRAGMA foreign_key_check`.
