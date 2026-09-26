# Hiring MVP direction reconciliation — evidence

Date: 2026-09-26 (Asia/Kolkata). Scope: repository and source reconciliation,
documentation correction, and a reviewable A01 handoff. A01 implementation,
model quality, and new factory acceptance remain pending.

## Sources and repository identity

- User correction: attached `Pasted text.txt`, SHA-256
  `825ea33c423c0aeb28fb72da3eab89b213600c684f5b010d48047421ea473cdf`.
- [Notion hiring proposal](https://app.notion.com/p/3d3cb716dfb4811dbc78ef6385011a0a)
  fetched on 2026-09-26. Title: “CrossSignal MVP — Revenue Leak Investigator
  (Hiring Build)”; last edited `2026-09-24T15:22:50.256Z`. Native Notion
  verification state is `unverified`; no truncation/unknown-block flags were
  returned. Sections 2, 6, 9, 12–15, 17 and 21–24 were inspected for scope,
  acceptance, A01, evaluation, and strategy. The user's correction resolves
  the stale real-check-first statement near the page top.
- Both root and nested `AGENTS.md` / `CONTEXT.md` were read, followed by the
  nested factory contract, architecture snapshot, and quality gates. No
  archive or later historical stage contract was loaded.
- Product checkout: `C:\Users\hisha\ChatGPT\CrossSignal\work\crosssignal-phase1`;
  branch `codex/phase3-decision-ux`;
  HEAD `d802898b2ced1580c1b196bfcd0ba82f3332b32a`.
- Outer checkout: `C:\Users\hisha\ChatGPT\CrossSignal`;
  branch `codex/supabase-migration`;
  HEAD `ca44f2eb180ed2d7d1fba1b606208a3294d4830d`.
- Verified using `git rev-parse --show-toplevel`, `git branch --show-current`,
  `git rev-parse HEAD`, `git log -4 --oneline`, `git status --short`, and
  `git remote -v`. The nested remote still references obsolete OneDrive.
  No remote operation was performed.

One outer-checkout inspection from the nested working directory encountered
Git's sandbox-user ownership check. It was repeated successfully using a
command-scoped `-c safe.directory=C:/Users/hisha/ChatGPT/CrossSignal`; no
global Git setting was changed. Git also warned about inaccessible global
ignore configuration. These warnings did not prevent the completed checks.

## Existing work preserved

At entry, the nested checkout had modified `package.json` and the progress
note, plus the untracked matrix scripts, evaluator, tests, reports, phase note,
and `supabase/.temp/`. The outer checkout had the untracked factory note.
The matrix remains uncommitted. This task adds direction notices to its phase
note and extends the already modified progress note while retaining their
historical evidence.

The following SHA-256 values were captured before documentation edits and
checked again afterward; the implementation, reports, package alias, and
pre-existing temp file retain their bytes:

| Preserved path | SHA-256 |
| --- | --- |
| `scripts/case-scenario-matrix.mjs` | `49f1e58971f5a69cf2632e9d06321ff57da21089a2158db73f304c5b385b8f0f` |
| `scripts/run-case-scenario-matrix.mjs` | `4192ee1c4d74218ea07954d20f8042f3542b2f2f733197ece877e82ffd276a4a` |
| `tests/case-scenario-matrix.test.mjs` | `59dc6bf4db827ac8f246e0ef6be596de249259d940a0f500f4813adb78c32398` |
| `tests/evaluator/case-scenario-matrix.truth.json` | `01b9934b80cfec1fc78f670f3246a6266711b4090609acab6396bb579c051250` |
| `tests/evaluator/grade-case-scenario-matrix.mjs` | `8cd116ace5eeb8887f5e2100f6029654778fc249a3b51236342205a9142a78a1` |
| `reports/case-scenario-matrix.artifact.json` | `e71100cd69caa4cfb02a2b8e912b3871e73e453f38081ab5897eafbcca6d1c2e` |
| `reports/case-scenario-matrix.md` | `fece9c9f8681e6dc6740c9925479a2e39f87bcfb1a4e17ea7b75c25fe8f73bf3` |
| `reports/golden-case-replay.artifact.json` | `df7eadbdc7569bcb1116087c51c1bd17e19fbf52f3159e4a780ebc14fe4294c2` |
| `package.json` | `c3950223888fb1dceabd0665497179473ca8c713021f30d2f349f3e6a6dd78c2` |
| `supabase/.temp/cli-latest` | `103e9d7a97f9a66c28586ffae6f8d81a90630d5cb2c537b23ed886a5e0e5ff01` |

The outer untracked `Software Factory - Keeping AI Agents Aligned.md`
retains SHA-256
`dd35c46d6528a55a1964751ec3167641549dd0d4085f8e0b930c24f9912e67f2`.
The outer router gains only an authoritative-checkout/direction pointer.

## Verification performed

Environment: Windows PowerShell, Node.js `v22.15.0`; local check session
2026-09-26 around 13:12 +05:30. Working directory for product commands is the
nested checkout.

```sh
node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs tests/case-simulation-outcome.test.mjs tests/golden-case-replay.test.mjs tests/case-scenario-matrix.test.mjs
```

Exit 0: **29 tests, 29 passed, 0 failed**. These existing tests cover
recorded-event derivation, tenant and citation tampering, exact manual-check
approval, trial exclusion, simulation trace integrity, and separate outcome
projections. Each replay test runs two fresh deterministic product processes
and compares exact bytes, then invokes its separate grader. Each grader is
also required to reject four altered artifacts. Tests create temporary
artifacts and leave the saved reports intact.

The saved [golden report](../reports/golden-case-replay.md) and
[matrix report](../reports/case-scenario-matrix.md) remain the evidence for the
existing local replay slices. Their artifacts have the hashes recorded above.
These checks do not cover an A01 rollback because it is not implemented.

`node factory/status.mjs` before and after correction: exit 0; all five
historical L14 stages complete, accepted, fresh; no active stage; release
unsealed due to worktree/index changes. No accepted stage, shared reference,
factory tool, or human gate was modified. Numbered product phases are not
hiring-MVP acceptance.

`git diff --check` passed in both repositories. A local Markdown link and
acceptance-ID check passed for ten documents, 34 local links, and twelve
unique A01 acceptance IDs. Preservation checks matched all ten recorded
implementation/report/package/temp hashes and the outer untracked note.
Documentation changes do not require a new application build or new unit tests;
the existing suite was rerun to verify the reported baseline.

## Implementation findings and practical limits

- `db/case-investigator.mjs` constructs three predefined findings and returns
  `targeted_drop_supported_cause_unconfirmed`; it is not a model evaluation.
- `db/case-response.mjs` constructs `internal_test_validation`. Its grant
  cannot be treated as authorization for a rollback.
- `supabase/functions/_shared/case-checkout.mjs` maps an operator-selected
  capture/decline scenario to its result. Its verified traces establish harness
  coverage, not a repaired incident.
- `db/flight-recorder-contracts.ts` already exposes
  `validateExecutionAuthority` / `assertExecutionAuthority`, including
  exact payload/context/policy binding, tenant, actor, nonce, expiry,
  one-time execution, and kill-switch checks. A01 should reuse these with a
  narrowly scoped new intent and simulator adapter; no rollback integration
  is claimed today.
- Existing replay orchestrators spawn a product process and a separate grader.
  Only the grader reads its answer file, but the processes are not configured
  with filesystem access isolation. A01 requires explicit denial and leakage
  tests before claiming evaluator truth is inaccessible.
- A bounded search of `app`, `db`, `scripts`, `tests`, and `docs`
  found no existing complete A01/Indian-debit/v142 implementation. Search
  references to rollback-only SQL tests are not intervention implementations.
- No `ollama`, `llama-cli`, or `lms` executable was found on PATH;
  the default `~/.ollama/models/manifests` directory was absent. No broader
  disk scan, model download, model call, or paid API call was performed.
  Suitable local model availability and behavioral evaluation remain pending.
- No remote database counts, deployed application, or actual device behavior
  were rechecked. Prior saved receipt/deployment facts remain dated evidence.
  No deployment, TEST/LIVE mutation, real payment, or business measurement ran.

## Reviewable outputs and next gate

- [Current direction](hiring-mvp-direction.md): demonstrated capability,
  unresolved gaps, source-conflict resolution, next milestone, safeguards.
- [A01 handoff](a01-synthetic-investigation-handoff.md): bounded specification,
  twelve acceptance items, tool outline, scenario/evaluator isolation,
  deterministic/model boundary, authority and simulator design, failure
  experiments, and staged implementation sequence.
- Both checkout routers point to the corrected direction. The progress note
  has a current section and explicitly historical older assessment. Phase 4c,
  4d, 4e, and 6 notes identify superseded next steps while preserving evidence.

Handoff SHA-256:
`1d0b708f915a54c056a38129cdd98193f0d828b4182fe6e69cd1e124934fcbbb`.

Direction record SHA-256:
`45bf3c41b8c33442c2e4d0b132ebacf41d39ec6c70e96a7dfdd037e4ffcc66ed`.

Factory contract SHA-256:
`9cb1f010e194fd1e2463cca6cd39454c17d902f0b45d073e1fc3fa80fc7cba77`.

These identify reviewed candidate documents, not an accepted gate. The
correction is documented; new product implementation stops at the existing
between-runs boundary. [factory/CONTEXT.md](../factory/CONTEXT.md) says a new
run may begin only from a sealed commit and that archiving/instantiation is
human-owned, with confirmation before Stage 01. The next decision is review
of this candidate and authorization of that transition while preserving all
work. Do not infer authorization to rewrite the historical run or clean away
unrelated files. Changes remain uncommitted.
