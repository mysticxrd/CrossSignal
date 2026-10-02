---
type: build-evidence
unit: b01-api-behavioral-benchmark
stage: 03_build
status: offline-preflight-prepared
truth_mode: SIMULATED
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
paid_api_authorization: not-granted
provider: gemini
proposed_model: gemini-3.5-flash-lite
complete_build: false
---

# Stage 03: Gemini offline preparation

## Accepted upstream and verified state

The owner said "approved" after the Stage 02 handoff. Data's gate now records
acceptance at 2026-10-01T21:22:14+05:30 of the unchanged DATA_PACKAGE hash
ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f and VERIFY hash
2b7e2dc16b1aeaa7706fe800180511133593f85a86aa5011587cb5aede0f1fcc. The gate also
binds CONTRACT_EVIDENCE.json directly as required by the factory. No accepted
Spec/Data or recorded evidence was regenerated. Both upstream stages are accepted
and fresh; Stage 03 is active. The owner subsequently selected "gemini".

Product: codex/phase3-decision-ux, HEAD 43d42d255bd22cb227e3410dda31ffb8437f6624.
Outer: codex/supabase-migration, HEAD ca44f2eb180ed2d7d1fba1b606208a3294d4830d.
Both repositories retain their existing uncommitted work; the release is unsealed.

## Changes and review artifacts

- db/benchmark/contracts.mjs, schemas.mjs, exposure.mjs and task.md are exact
  public-contract copies from accepted Data. Originals and private evaluator
  files are untouched; the adapter imports no rubric, generator or private world.
- gemini-config.mjs proposes a fixed REST endpoint/model, limits and disabled-call
  guard. gemini.mjs prepares one synthetic single-shot request and inspects fixture
  responses. Schema projection retains strict host validation and records every
  unsupported wire keyword. No executable HTTP dispatch or secret lookup exists.
- tests/benchmark.test.mjs contains 10 offline contract/failure tests. No fixture
  answer is a model result or grade. Unsafe recommendations remain data to grade,
  without any approval/execution capability.
- GEMINI_PROPOSAL.md links current official sources and identifies review decisions.
  PREPARED_REQUESTS.json preserves five exact sanitized request bodies and exposure
  IDs/hashes. The largest body is 6842 bytes; with output/framing reservation it
  fits only the conditional byte-fallback bound. Actual Gemini tokens are unknown.
- This stage's contract declares the offline scope. Its verifier supports
  --preflight for those checks and returns exit 2 in default mode because complete
  Build evidence is absent. It does not open or accept a gate.

The model identifier is proposed, not approved. Public documentation establishes
syntax/capabilities; parameter compatibility, tokenizer/framing, billing scope
and investigation quality have not been tested. No key/account inspection,
installation, download, model call, stored Case write, runtime intervention,
LIVE change or deployment occurred.

## Checks and preservation

Offline checks ran 2026-10-01T16:13:41.729Z–2026-10-01T16:14:10.559Z on v22.15.0,
Windows x64. All 10 fixture tests, lint on the new surface and both repositories'
diff checks passed. Data revalidation passed 13 contract checks, seven negative
package checks and 22 bindings, including 934 currently protected historical files.
Raw commands/timestamps/exit codes/TAP are in OFFLINE_CHECKS.json.

PREFLIGHT_PRESERVATION.json was captured after the Data acceptance was recorded.
Against that baseline: outer 3499 files unchanged; product 1309 files unchanged,
with only factory/03_build/CONTEXT.md intentionally edited. All 1044 outer and
364 product directories remain. Junctions, HEADs, branches, Git indexes and
unrelated status entries are unchanged. Product preservation includes all 118
archived A01 factory files, 477 stored A01 files, all 35 current Data files,
migrations, fixtures, evaluator sources and the excluded trial receipt. New files
are confined to the declared benchmark/test/Stage 03 surfaces. No old source,
accepted evidence, database, history or generated output was removed or relocated.

## Complete Build remains unfinished

- Specific model/configuration review and explicit authorization for any API/model request.
- Account-scoped verified free allocation with no paid fallback at the unchanged USD 0 cap.
- Actual provider tokenizer/framing and request/response compatibility checks.
- Durable read-only benchmark store, bounded multi-turn investigator and interruption recovery.
- Frozen rules/prompts/configuration/schedule, three baselines and independent blinded adjudication.
- Development-only failure analysis, one pre-registered change and preserved second-round results.
- Separate exact human-approved SIMULATED intervention and observed outcome.
- Required complete Build lint/build/A01 and affected regression checks before opening its gate.

These are separate execution/review conditions, not a request to accept this
incomplete Build. The exact rule is Stage 03 CONTEXT, Process 1: "Require
accepted/fresh Data and explicit provider/model/spend conditions." The original
no-model-call instruction still applies even to a free allocation. Quality gates
require build/lint/tests before opening a human gate. No later stage is advanced.
Historical entry documents retain their hash-bound preparation-time wording;
this current packet records the selected provider without rewriting acceptance.

## Declared input hashes

All file/directory bindings use the factory's normalized text hashing; raw byte
preservation is verified separately against the preflight inventory.

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `fd9e1d3f3f4710acfc335294a762da8afc2c2fb87aba731afe54318a96af4929` |
| `factory/03_build/verify.mjs` | `f63dcefef46150e49321e962ba4319d436b199eae56307834af0cbbfa1e4edb2` |
| `factory/01_spec/output/SPEC.md` | `e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e` |
| `factory/02_data/output/DATA_PACKAGE.md` | `ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f` |
| `factory/02_data/output/HUMAN_GATE.md` | `06bd60ec2e816cddcb4ecfe3db0ca0a9e0e0361edb1a7a326287e4302167a722` |
| `factory/02_data/output/VERIFY.md` | `2b7e2dc16b1aeaa7706fe800180511133593f85a86aa5011587cb5aede0f1fcc` |
| `factory/02_data/output/CONTRACT_EVIDENCE.json` | `17e988cb707f00ec913fe7213f47e3f82629580d0d60f845144810f7e0fd4935` |
| `factory/02_data/benchmark` | `be6d15ef711e30cf2820855eedc99508458f2de9cce513fc3d8597af2dc002da` |
| `factory/_shared/BENCHMARK_DIRECTION.md` | `361535a1979ff66497ded9ef1aefd6e43b0eae42bce9fadb88e6bab74ba17f6e` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/02_data/verify.mjs` | `719462a7162c8f2dd00e13c763551e5034063793a46da1be4b405b45c58f5aa5` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/status.mjs` | `a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5` |
| `docs/api-execution-boundary.md` | `e1991c048563420f99543235a1d5bda5dfced6e65ccfb1aa61af3abf35c3dfbd` |
| `eslint.config.mjs` | `fd783131de1685f7971a45e0b493e1e8b818fc5c9d56ecd3fe401b29b8272c7d` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `package-lock.json` | `5cdde3db2fa840e2e9a3f162f706336c04296e5f52dc8be574956521c9453d87` |
| `db/benchmark` | `1d832be548dcaba7357ab9210c9475ba98cbd1ece7b65fd9c8bb277a3bc840f8` |
| `tests/benchmark.test.mjs` | `bbf03624252793a9877561fb8762fe749c1ce076520d1c489578ea2659b6760b` |
| `factory/03_build/output/PREFLIGHT_PRESERVATION.json` | `cd700b26f8368977b6aa90358fc7ec30c275314efc7a888a3815c29027203551` |
| `factory/03_build/output/GEMINI_PROPOSAL.md` | `e17ef0089dee2e5c82376abdc446fbaa281bc9360cd44fe5522a79bcd9256622` |
| `factory/03_build/output/PREPARED_REQUESTS.json` | `4b3bfb87e0f2276c13c722d7e0f9ee15af47add0069afd93183de6b736756c94` |
| `factory/03_build/output/OFFLINE_CHECKS.json` | `2765304ad0fe62e73edb063ba779c8985b341052e98307bf47e856ae7b0c0f52` |
