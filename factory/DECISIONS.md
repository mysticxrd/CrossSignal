# Factory decisions

Append-only owner decisions, never a status table. Historical quotes retain their source wording; derive current state with status.mjs.

## D-01 — Subscription amendment retained

- Date: 2026-10-02
- Decided by: Owner, as recorded in the contract
- Scope: B01 subscription history and conditional compatibility
- Source: `factory/03_build/CONTEXT.md@62787d1:18,31`

Owner words, verbatim:

- Historical subscription amendment inputs: `../01_spec/amendments/b01-siwc-measured-v1/CONTRACT.md` and `HUMAN_GATE.md`; `../02_data/amendments/b01-siwc-measured-v1/DATA_COMPATIBILITY.md`, `VERIFY.md`, `HUMAN_GATE.md`. Preserve the accepted amendment and pending compatibility decision. The SIWC profile is not selected; its acceptance conditions apply if that route is resumed. Gemini preparation retains the original accepted Spec/Data token limits.

   Preserve the previously accepted b01-siwc-measured-v1 amendment (proposal hash fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f) as history. Its pending Data compatibility gate is not accepted or revoked. It does not replace Gemini's original token contract. Unsupported limits on any resumed route require an exact contract proposal before scoring. No complete Build or runtime grant is inferred from provider selection.

## D-02 — Bounded runner continuation

- Date: 2026-10-02
- Decided by: Owner, as recorded in the contract
- Scope: B01 runner inputs, stores, preservation and prohibitions
- Source: `factory/03_build/CONTEXT.md@62787d1:23`

Owner words, verbatim:

- October 2 runner continuation inputs: `runner-checks.mjs`, `output/gemini-runner-v1/` (additive preservation/reconciliation, owner Free-tier attestation, provider contract, initial/final offline verification and application checks), `../../tests/benchmark-gemini-runner.test.mjs`, and test-only `../../tests/a01-path-compat.mjs`. The owner authorized offline runner completion followed only by already-authorized Free-tier benchmark requests after every accepted limit/isolation check. Original manifests and accepted Spec/Data/A01 inputs remain unchanged. Existing documentation edits are retained through exact old/current hash records, not a replaced baseline. New benchmark stores live in `../../outputs/b01/gemini-runner-v1/`; no A01 migration, paid fallback, smoke generation, runtime effect or gate advance. Disposable build-input snapshots under `../../outputs/build-checks/` protect existing dist/.vinext contents from the packaging hook; use existing project-root dependencies only.

## D-03 — Conditional free-tier route

- Date: 2026-10-02
- Decided by: Owner, as recorded in the contract
- Scope: Original limits, conditional $0 requests and authority boundaries
- Source: `factory/03_build/CONTEXT.md@62787d1:29-31`

Owner words, verbatim:

1. Require accepted/fresh Data and explicit provider/model/spend conditions.
   The owner requested the fastest testing route and directed skipping ChatGPT subscription integration if it adds complexity. Continue Gemini preparation using the existing gemini-3.5-flash-lite proposal and original accepted limits. The owner answered "Authorize verified free-tier Gemini requests": this permits $0 requests only after a Free-tier project with billing disabled, sufficient quota and original-limit compatibility are verified. No paid fallback, purchase, installation, deployment or runtime intervention is authorized. Account/actual-route checks and complete Build evidence remain unfinished; never treat a caller flag or account subscription badge as API billing proof.
   Preserve the previously accepted b01-siwc-measured-v1 amendment (proposal hash fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f) as history. Its pending Data compatibility gate is not accepted or revoked. It does not replace Gemini's original token contract. Unsupported limits on any resumed route require an exact contract proposal before scoring. No complete Build or runtime grant is inferred from provider selection.

## D-04 — Confirmed B01 transition

- Date: 2026-10-01
- Decided by: Owner, as recorded in the router
- Scope: Stage entry is separate from stage acceptance
- Source: `CONTEXT.md@62787d1:28-32`

Owner words, verbatim:

The current run is `b01-api-behavioral-benchmark`. The user confirmed transition
and Stage 01 entry on October 1. Start with `factory/CONTEXT.md`, derive status,
then read only the active stage. Stage acceptance remains a separate human gate.
The [transition record](factory/TRANSITION.md) binds the sealed A01 baseline
`43d42d255bd22cb227e3410dda31ffb8437f6624` and complete preserved factory.

## D-05 — Separate simulated intervention authority

- Date: 2026-10-02
- Decided by: Owner, as recorded in the router
- Scope: Exact runtime-human approval and deferred mobile follow-up
- Source: `CONTEXT.md@62787d1:47-49`

Owner words, verbatim:

Complete
one exact approved SIMULATED intervention within B01; stage acceptance never
grants rollback authority. Mobile Safari real-check/follow-up work remains deferred.

## D-06 — B01 preflight superseded

- Date: 2026-10-03
- Decided by: Owner
- Scope: Factory diet preservation; no runner continuation in this change
- Source: Owner pasted request; check sources: `factory/03_build/gemini-preflight.mjs@62787d1:74-89`, `factory/03_build/runner-checks.mjs@62787d1:24-62`, `factory/03_build/subscription-preflight.mjs@62787d1:76-90`

Owner words, verbatim:

- The snapshot commit replaces the three preflights' HEAD, index, status and file-hash checks.
- Before any runner continuation, the B01 resume must re-point those checks to changedSince(<snapshot>, …) from step 3.
- git diff b01/run-snapshot..b01/factory-diet lists every file this diet changed.

Snapshot: `62787d1e832773a24fda569826d3adc2789a6585`. Existing scripts, packets and preservation-baseline.json remain unchanged.

## D-07 — Credential scan amendment

- Date: 2026-10-03
- Decided by: Owner
- Scope: Snapshot credential scan only
- Source: Direct owner message in this chat; committed evidence: `factory/02_data/postgres/0001_trace_resolution_read_model.sql@43d42d2:343-349` and `factory/02_data/postgres/0001_trace_resolution_read_model.tests.sql@43d42d2:27-34`

Owner words, verbatim:

Owner decision: the two `service_role` matches are not secrets. Continue.

Evidence (checked without opening _archive/):
- Both archive files are byte-identical to files already committed in 43d42d2:
  - 0001_trace_resolution_read_model.sql: blob 09605553f5f7944d49f4e591795b5ec8dc5c069b
  - 0001_trace_resolution_read_model.tests.sql: blob 4ed81fec93b71e7286f48ed8760fd9c9b86ec365
  Confirm with `git hash-object <archive path>` and `git rev-parse 43d42d2:factory/02_data/postgres/<file>`.
- In the committed copies, `service_role` is the built-in Supabase Postgres role name. It appears in `revoke … from public, anon, authenticated, service_role` statements and in `has_table_privilege('service_role', …)` checks. Neither file contains a key-shaped string.

Scan rule amendment for the rest of this run:
- Drop bare `service_role`; it is a role name, not a credential.
- Flag only key-shaped values:
  - JWTs (`eyJ…` with two dots)
  - `sb_secret_…` and `sbp_…`
  - a `SERVICE_ROLE_KEY` assignment with a non-empty value
- The earlier rule still applies to every other pattern.

Re-run the amended scan, then continue from step 1. Record this decision in factory/DECISIONS.md when you create it in step 2, citing the two blob hashes, and list it in the final report.

Both blob comparisons were confirmed before the amended scan; file contents were not loaded from the archive.

## D-08 — Workspace test migration

- Date: 2026-10-03
- Decided by: Owner (requested scope); Codex (implementation)
- Scope: Preserve retired assertions and exercise current contracts without editing accepted inputs.
- Source: owner pasted request; accepted exclusion: `factory/02_data/CONTEXT.md@62787d1:26`; old assertions: `tests/icm-workspace.test.mjs@62787d1:36-209`.

Owner words, verbatim:

When a workspace test disagrees with an accepted, hash-bound file, change the test but keep what it was protecting, and report each such change.

The original suite is retained byte-for-byte in tests/icm-workspace-legacy.test.mjs. Current tests retain historical exclusion with /^Do not load:.*archive/m rather than requiring the literal _archive/ token in accepted Data. The active-stage and derived-status assertions use the existing factory contract wording. Gate checks permit blocked/pending and missing future outputs while requiring closed gates, passed verification and intact bindings for accepted decisions. The valid Spec fixture is extended to the accepted B01 Spec; missing-evidence and invented-authority negatives remain. Central budgets replace the old word tokenizer and 500/6000 limits. Historical architecture provenance and obsolete-path exclusions remain tested.

## D-09 — Git preservation and deferred inventory removal

- Date: 2026-10-03
- Decided by: Owner
- Scope: New-run preservation and superseded B01 preparatory inventories/copies.
- Source: owner pasted request; existing checks: `factory/03_build/gemini-preflight.mjs@62787d1:74-89` and `factory/03_build/subscription-preflight.mjs@62787d1:76-90`.

Owner words, verbatim:

Delete nothing. In DECISIONS.md, list the existing inventories and copies, with sizes from du, as removable when the B01 Build re-runs. Do not read archive contents.

Measured with du -sb (apparent bytes; metadata only). The following preparatory inventories/copies are removable only when B01 Build re-runs with the Git preservation replacement, after their consumers and any uniquely needed evidence are retained. No removal occurs in this diet. Accepted outputs/gates, the A01 archive and preservation manifest, and factory/02_data/benchmark/private/preservation-baseline.json remain protected.

- `factory/03_build/output/chatgpt-subscription/PRESERVATION_BEFORE.json`: 990078 bytes.
- `factory/03_build/output/chatgpt-subscription/measured-profile/PRESERVATION_BEFORE.json`: 994734 bytes.
- `factory/03_build/output/chatgpt-subscription/measured-profile/prior-current`: 57644 bytes.
- `factory/03_build/output/chatgpt-subscription/prior-current`: 25870 bytes.
- `factory/03_build/output/gemini-resume/PRESERVATION_BEFORE.json`: 1001924 bytes.
- `factory/03_build/output/gemini-resume/prior-current`: 48248 bytes.
- `factory/03_build/output/gemini-runner-v1/PRESERVATION_BEFORE.json`: 1008033 bytes.
- `factory/03_build/output/gemini-runner-v1/execution-source`: 236556 bytes.
- `factory/03_build/output/gemini-runner-v1/prior-current`: 22692 bytes.
- `factory/03_build/output/hiring-showcase-v1/PRESERVATION_BEFORE.json`: 1114873 bytes.
- `factory/03_build/output/hiring-showcase-v1/continuation-v1/PRESERVATION_BEFORE.json`: 1121677 bytes.
- `factory/03_build/output/hiring-showcase-v1/continuation-v1/repair-v1/PRESERVATION_BEFORE.json`: 1128964 bytes.
- `factory/03_build/output/hiring-showcase-v1/continuation-v1/repair-v1/execution-source`: 1854300 bytes.
- `outputs/build-checks`: 11328972 bytes.
