# Phase 4b: TEST check receipt and follow-up outcome path

Implemented on 2026-09-24 for the one synthetic Mobile Safari revenue-leak
Case in Supabase Free-plan TEST project `tonuxepirauyqcwbwenw`. The product
can record a workspace owner's attestation that the exact approved manual TEST
check was performed, then assess seven days of separately recorded follow-up
fixture observations. It does not run checkout, change production, prove a
cause, or claim recovered revenue. LIVE remains on D1 and unchanged.

## Contract and user path

The signed-in owner first reviews and approves the exact Phase 4a proposal.
After actually performing one manual TEST Mobile Safari checkout check, the
owner can enter a non-sensitive run reference (8–64 letters, digits, `_`, or
`-`) and state whether payment capture was `captured`, `not_captured`, or
`indeterminate`. The server reloads and verifies the Case and proposal before
calling `case.check.record`. The Edge Function checks owner membership, exact
proposal hash, and saved approval. It timestamps one immutable receipt and
returns an idempotent result for a retry with the same reference and result.
The receipt is an owner attestation, not independent proof of payment capture.
The form is unavailable before approval. No actual approval or check was
submitted as part of fixture setup.

Follow-up observations live in `case_follow_up_events`, separately from the 56
original incident events. The TEST scenario administrator imports a complete
seven-day batch of paired checkout and payment observations after a receipt
exists. `scripts/generate-case-follow-up-sql.mjs input.json output.sql`
validates the full batch and generates receipt-bound, repeatable inserts with
saved-row assertions. The script never deletes or rewrites existing data.
The input has `{ receipt: { workspaceId, caseId, responseId, checkedAt,
contentHash }, events: [...] }`. Each event has the exact keys `workspaceId`,
`id`, `caseId`, `responseId`, `source`, `segment`, `observedDay`, `starts`,
`completed`, `captures`, and `revenueCents`. The receipt hash and timestamp
must come from the saved Case, and the SQL joins the actual receipt and
proposal before inserting. Do not include evaluator ground truth.

The Case projection recomputes follow-up totals from saved events. It rejects
foreign tenants, invalid dates/counts, changed hashes, duplicates, missing
daily payment counterparts, and event sets without a verified receipt. Seven
consecutive days and at least 100 eligible starts are required for an
assessment. Incomplete data remains pending; an eligible batch is labeled
`correlated_only` with event IDs, conversion, captures, and recorded TEST
revenue. The original anomaly and investigation remain verified from their
original 56 events. No causal effect or recovered-revenue number is produced.

## Persistence and verification

- Additive migrations `202609240001_case_response_receipts.sql` and
  `202609240002_case_follow_up_events.sql` were applied to TEST. Both tables
  use forced RLS and tenant-bound foreign keys. The runtime role can read and
  insert only an owner receipt after exact approval; follow-up event inserts
  are reserved for the TEST scenario administrator. Neither table grants
  runtime UPDATE or DELETE.
- `cfr-trace-reader` version 9 was deployed ACTIVE with its existing custom
  preview-token authentication (`verify_jwt=false`). Its shared server-side
  preview token remains a TEST-only gateway credential; production approval
  and attestation need user-bound credentials.
- The separate owner-private TEST Site source was pushed at commit
  `2671f62545a15d5477f62d1871e9b62d873147d3` and deployed as Site
  version 7, deployment `appgdep_6ab4901459fc81919349564262a7a1b6`,
  at `https://crosssignal-supabase-test.hishamxrd.chatgpt.site/`. The first
  archive attempt had the Worker entrypoint at the wrong level and was
  rejected before saving. The corrected archive contained root TEST hosting
  metadata and `dist/server/index.js`; version 7 saved and deployed
  successfully. Its Sites archive hash was
  `sha256:21c9073eaf4e606c7df13b943ab22b10806ca5a387e0cda244eedabb1ee89a2d`.
- A signed-in browser reload of Site version 7 preserved the Case signal,
  three claims, 42 evidence references, exact proposal hash, owner approval
  control, and the new "completed owner-attested TEST check required" pending
  state. The receipt form was correctly absent before approval. No approval
  button was clicked.
- Nineteen focused tests passed for deterministic detection, Case citations,
  receipt validation, cross-tenant rejection, seven-day outcome calculation,
  and import generation, including a JSON save/reload projection of a complete
  receipt and correlated follow-up. The full `vinext` build passed. Repository-wide
  `tsc` still reports known archived Eve, Cloudflare ambient-type, and local
  Deno ambient-type errors; no new application TypeScript error remains.
- In rollback-only TEST database transactions, the restricted owner role
  inserted one approval and one receipt, then read the receipt. A foreign
  principal saw zero receipts and its insert was rejected. A separately
  inserted follow-up row was visible to the owner reader and invisible to a
  foreign principal. After rollback, TEST still had zero actual approvals,
  receipts, and follow-up rows, plus all 56 original Case events and both
  runtime JSON normalization triggers.
- Supabase's security advisor reported no findings. Performance advice was
  limited to informational unused indexes, including new indexes on empty
  tables. No paid resource or model evaluation was enabled.

## Current boundary and next action

The actual business sequence remains pending: the owner must intentionally
approve the response, perform the manual TEST check, and save its receipt.
Only then can seven genuinely new TEST follow-up days be imported. The real
HTTP write path and full save/reload of a persisted receipt or outcome have
not been exercised because completing them would falsely imply that the
manual check and observations occurred. The database write path was tested
in rollback transactions, and JSON projection save/reload was tested locally.

After the observations exist, inspect the correlation-only assessment and
its event IDs in the private TEST Site. Replay/Evaluation remains the next
product stage after this Action/Outcome path. The L14 factory seal is a
historical gate for trace-resolution parity; it is not a new human acceptance
of this Case milestone.
