# CrossSignal workspace clarity and preservation manifest

This mutable review index was rechecked on **2026-10-02, Asia/Calcutta**.
It reuses the October 1 cleanup packet; its original machine records,
[October 1 check report](CHECKS.md) and [junction repair receipt](junction-repair/RESULT.md)
remain historical evidence. This pass is documentation and boundary verification,
not a factory run, acceptance, runtime grant or physical disposition.

## Authority and current state

- **O — project root and historical Git repository:**
  `C:/Users/hisha/ChatGPT/CrossSignal`.
- **P — authoritative active product Git repository:**
  `C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1`.
- Open [CrossSignal.code-workspace](../../CrossSignal.code-workspace). It contains
  only P and this review directory. O's source and factory are preserved history,
  not a second active execution state. The obsolete OneDrive checkout is not a
  working source or a dependency target for P.

| Repository | Verified branch | Verified HEAD | Working tree |
| --- | --- | --- | --- |
| O | `codex/supabase-migration` | `ca44f2eb180ed2d7d1fba1b606208a3294d4830d` | Existing modified README/router/configs and untracked workspace/planning work |
| P | `codex/phase3-decision-ux` | `43d42d255bd22cb227e3410dda31ffb8437f6624` | Existing uncommitted B01 transition, accepted Spec/Data, amendments and Build preparation |

P's HEAD is the sealed A01 baseline; its working tree is B01 and unsealed.
Run this **in P**, after checking its own Git state, before every resume:

```powershell
Set-Location C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1
node factory/status.mjs
```

On October 2 the derived result was Spec/Data complete, accepted and fresh;
Stage `03_build` in progress, gate incomplete, dependencies fresh;
Verify/Ship never run; release unsealed. Build VERIFY records an offline
preflight pass and incomplete full Build. Model evaluation and exact human
runtime approval remain NOT_RUN. This dated observation does not replace
the status command or authorize inherited operations.

## Architecture and scoped loading

The [ICM folder architecture](https://app.notion.com/p/3e7cb716dfb4801faad0ed7a552e2da5)
defines identity, routing, stage contract, scoped references and working
artifacts as separate context layers. Here those map to P's AGENTS/CONTEXT,
factory router/status, active stage CONTEXT, its two named shared references,
and declared current/upstream artifacts. A folder has one responsibility;
archive/package/result trees are not default context.

The [AI Agent Factory and CrossSignal pilot](https://app.notion.com/p/3ebcb716dfb481c699c2f48016bcb388)
separates engineering agents from product investigators and requires current
checkout/evidence checks on resume. Its proposed new controller documents are
unnecessary here: existing factory status, contracts, gates, transition records
and runtime stores already have those jobs. The factory authors and verifies
deliverables; application/database code owns persistence, authorization,
concurrency and effects. Hidden evaluator truth stays separate from product
observables and model inputs. Neither Notion nor this manifest is another state machine.

For governed work read only P's factory router, the derived active stage's
contract, its declared inputs and named shared references. Later stages,
archived contracts, dependency contents and entire source vaults stay outside
normal loading. Hash-only preservation of historical files is not loading their
instructions into the active stage.

## Planning reconciliation

| Dated statement | Current interpretation and evidence |
| --- | --- |
| September 30 Notion pilot proposes a local model and describes sealed A01 with no active stage | A dated design proposal based on Notion, not a current checkout inspection. The API charter and accepted B01 Spec/Data govern the current benchmark; no local-model installation is required. |
| Old cleanup/README text says B01 Spec pending and Data/Build not started | Superseded by P's October 2 derived status: Spec/Data accepted/fresh, Build incomplete. Old machine records and gate receipts keep their original dated claims. |
| Initial planning headers leave provider/model open | [Current Build contract](../../work/crosssignal-phase1/factory/03_build/CONTEXT.md) selects Gemini preparation with the original accepted token limits and conditional verified-free-tier request authority. Account, billing, quota and actual-route/token compatibility remain unfinished; no request is made in this pass. |
| SIWC measured-profile proposal still contains pending wording | Its separate Spec amendment gate is accepted; Data compatibility is pending. SIWC is not the selected route. Preserve the proposal, gate and compatibility evidence; neither acceptance nor revocation is inferred here. |
| Original charter/reconciliation says A01 sealed, between runs, or provider pending | Hash-bound accepted planning inputs retain preparation-time text. P README/CONTEXT provide current routing, and the active contract supplies subsequent decisions. No planning hash or verifier is rewritten. |
| Outer CONTEXT points to hiring direction and pending A01 | Raw-hash protected by the accepted Spec verifier. Preserved unchanged; the [exact source/binding proposal](ENTRY_ROUTER_PROPOSAL.md) routes all current work to P without borrowing historical acceptance. |
| Five A01 branches establish five-case model competence | A01 establishes scripted local mechanics for one incident with five branches. B01 has five causal cases; model quality and exact human intervention are still NOT_RUN. |
| Cleanup manifest says P's dependency junction is broken and repair pending | The October 1 bounded repair receipt records completion; current link/versions independently match. No active-product repair remains. A different historical test-source junction is still broken and separately classified below. |

No Notion page, accepted planning input, historical checkpoint, compatibility
gate or factory evidence was edited. Physical folder changes, controller
expansion, provider verification and runtime work are outside this pass.

## Classification and disposition

“Tracked” is relative to the row's owning repository. P is an independent nested
repository; O ignores `work/` and does not track P or the other packages/repos.
Ignored, generated, duplicated or unreferenced does not mean disposable.
Reference checks below cover current source/config/tests/entry documents only;
they do not assert the absence of historical or external references.

| Class and exact scope | Purpose and references | Git ownership | Preservation requirement | Proposed disposition |
| --- | --- | --- | --- | --- |
| **Active source:** P `app/`, `db/`, `drizzle/`, `worker/`, `scripts/`, `tests/`, `public/`, `examples/`, `supabase/`, root configs/lockfile | Product runtime, local investigator, migrations, fixtures and evaluators. Tests/scripts consume these directly. | P tracked source plus existing untracked `db/benchmark/` and benchmark tests/evaluator work; O does not own P's index. | Preserve all source/tests, current B01 preparation, migrations, fixtures, grading boundaries and unrelated work. | Retain in P and in appropriate checks. No deduplication, source relocation or runtime fix. |
| **Build inputs:** O/P `build/sites-vite-plugin.ts`, `.openai/hosting.json`, `vite.config.ts` | Vite imports the plugin and hosting metadata; rendered-HTML tests inspect metadata/build output. `build/` is source here. | Tracked independently by O/P. | Exact contents, references and check visibility remain. | Keep plugin in TypeScript/lint; keep hosting input accessible. Never blanket-ignore or archive `build/` or `.openai/`. |
| **Active factory:** P `factory/` | B01 contracts, accepted Spec/Data, frozen benchmark package, verifier/gates, Build preparation and retained route/amendment evidence. | P tracked changes and existing untracked preparation. | Accepted inputs/outputs/gates and all preparation hashes remain; SIWC compatibility stays pending; later-stage absence remains as found. | Retain; only derive status. No verifier changes, gate edits, preparation rerun, stage advance or seal. |
| **Historical outer source/factory:** O runtime trees and `factory/` | Earlier onboarding-rescue implementation and accepted release provenance. Root README now sends execution to P. | O's separate tracked history/index. | Preserve meaningful differences, historical gates and all existing modifications. | Retain in place; historical commands are reference instructions. No physical archive proposal for either repository's source tree. |
| **Historical accepted evidence:** O/P `_archive/`; P A01 preservation manifest; accepted `docs/hiring-mvp-direction.md`, `docs/a01-release-status.md` and source references | Sealed/reviewed history, stage proof and dated planning. A01 README links point into the preserved factory. | O/P tracked history plus the existing untracked preserved A01 factory in P. | Raw bytes and hashes, including all 118 A01 factory files and both preservation manifests. | Retain; explicit historical retrieval or hash inspection only. Never rewrite old status to look current. |
| **Planning packets:** O `planning/2026-09-30-api-behavioral-benchmark/` and this cleanup directory | Candidate, activation, preservation, source snapshots and review evidence; current cleanup index/proposals. | O untracked planning work. | Preserve candidate/gate/check receipts and their hashes. The old next-run README is itself bound by its preparation gate; do not relabel it as active. | Retain. The old candidate factory and activation scripts are historical preparation, not operations to resume. Reuse this mutable manifest/proposal/check index. |
| **Staged packages:** nine O `work/` directories in the exact inventory below | Earlier copied Case/Sites packages. Purpose inferred from names/tree; no current source import/reference found in the scoped search. | No own Git marker; ignored by O. | Preserve every file and any package provenance; content overlap is not authority to remove. | Retain in place outside routine editor/check context. No package-directory move is proposed in this pass. |
| **Historical repositories:** O `work/crosssignal-test-site/`, `work/crosssignal-test-source-open/` | Git-only scaffold and deployed-source/test provenance respectively. P `docs/phase4d-synthetic-checkout-harness.md:56` cites test-source commit `0a66d2a...`. | Independent Git repositories, ignored by O. Test-site has no commits/refs/index entries on `main`; test-source is clean on `main`, HEAD `e07fc0309d13be31a4b86149bf3e645badd3ab04`, 461 tracked files. | Preserve all Git metadata/refs and source; no Git initialization, reset, replacement or cleanup. | Retain both in place. No repository archive/deduplication proposal. Historical dependency link is separately reviewed below. |
| **Exports:** nine exact O `work/*.tar.gz` files below | Historical distributable Case/Sites snapshots; no current source reference found in the scoped search. | Ignored by O; no independent Git ownership. | Preserve raw hashes and byte counts. Check all historical/external references before any future move. | Nine exact preserving moves remain proposed, pending review; destinations below. No extraction, move or deletion now. |
| **Recovery/checkpoint helpers:** O `work/crosssignal-recovery.gitconfig`, `test-site-safe.gitconfig`, `hash-stage03-inputs.mjs`, `supabase-stage03-checkpoint.md` | Historical recovery settings, source-hash helper and checkpoint provenance; no current source reference found. | Ignored by O. | Preserve bytes and recovery context. | Retain in place; O's `work/` boundary excludes default discovery. |
| **Generated caches/bundles:** O/P `.next/`, `dist/`, `tsconfig.tsbuildinfo`; O `.vinext/` | Generated types/build artifacts; `tests/rendered-html.test.mjs` consumes bundles. P has no `.vinext/` currently. | Ignored by owning O/P. | Preserve all existing artifacts this pass; keep explicit `.next/types` and `.next/dev/types` compiler roots. | Exclude bundles/build-info from default checks/search. Only the exact future cache deletion/rebuild scope below is a proposal. |
| **Stored results and durable local state:** P `outputs/a01/`, `reports/`; O/P `.wrangler/` | A01 has 477 files, 22,823,347 bytes and 120 database/sidecar filenames. Four reports hold 477,718 bytes. O Wrangler has 16 database/sidecar filenames among 21 files; P Wrangler has one 74-byte file. Scripts/tests use A01 paths. | P's four reports are tracked; A01/Wrangler results are ignored by their owning repository. | Preserve stores, nonce/approval/Pause state, append-only history, failures, excluded trial receipt and all evidence. No DB opening/replay. | Retain in place. Wrangler state is not blanket disposable cache. Search/lint exclusions do not remove Explorer access. |
| **Dependencies and junctions:** O `node_modules/`; P link; historical test-source link | Shared installed toolchain; P resolves to O. Historical link still targets absent OneDrive dependencies. | Ignored dependency directory and two separate reparse points. | No dependency content, lockfile, link or obsolete target changes this pass. | P repair already completed/verified. Optional historical junction-only proposal below; no execution. |
| **Empty scaffolds:** O `benchmarks/`, `.sites-package/`, `.zcode/` | Currently empty tool scaffolding: 285, 1 and 2 directories respectively, no files/links. | Untracked/ignored by local boundaries. | Preserve directory inventories now; recheck exact emptiness before any disposition. | Hidden in O's navigation/search. Original empty-directory removal proposal remains pending review. |
| **Examples/starter assets:** O/P `examples/d1/`, `public/file.svg`, `globe.svg`, `window.svg` | Examples remain compiler/lint inputs; public assets are externally addressable even without source imports. | Independently tracked by O/P. | Preserve accepted source and potential URL compatibility. | Retain; asset retirement would be separate product/compatibility work. |
| **Mutable entry and development controls:** O/P README; P CONTEXT; O/P TS/lint/editor configs; O workspace; protected O CONTEXT | Current entry routing and scoped development; exact outer-router hash is a Spec assertion. | Tracked entries/configs plus existing untracked workspace/editor settings. | Preserve pre-existing changes. Leave all configs/workspace untouched because live discovery shows no gap. Keep protected O router raw hash `26016ff186b3548883cf246131a26afa0dfcb828b4336aeefc98a8e99d13db7c`. | Correct mutable README/P router only; protected source change stays an exact linked proposal. |

## Rechecked overlap and work inventory

There are 428 common tracked paths: 391 identical after CRLF-to-LF
normalization, of which 290 are archived and **101 are outside archives**;
27 differ and 10 are absent from one current tree after inherited transitions.
The old packet's 19 differing / 18 absent counts are superseded observations.
Examples of material differences include application UI, package.json,
Supabase implementation and current B01 contracts/gates. Normalized equality
does not prove raw-byte equality or whole-tree equivalence. No deduplication follows.

O's `work/` still contains one active product, nine staged package directories,
two historical repositories, nine exports and four checkpoint/helper files.
The original per-candidate non-Git/dependency byte counts below still match.
“Git marker” is now supplemented by the focused repository observations above;
this pass did not audit every object or ref's provenance.

| Path | Non-Git/dependency bytes | Git marker | Purpose inferred from tree/name |
| --- | ---: | --- | --- |
| `work/crosssignal-case-package/` | 2,902,974 | No | Packaged Case build |
| `work/crosssignal-case-package-v2/` | 2,903,856 | No | Revised packaged Case build |
| `work/crosssignal-phase4-site-stage-20260924/` | 2,914,763 | No | Historical staged Sites package |
| `work/crosssignal-phase4b-site-stage-20260924/` | 2,928,523 | No | Historical staged Sites package |
| `work/crosssignal-phase4b-site-stage2-20260924/` | 2,928,614 | No | Historical staged Sites package |
| `work/crosssignal-phase4c-site-stage-20260924/` | 2,936,103 | No | Historical staged Sites package |
| `work/crosssignal-phase4c-site-stage-final-20260924/` | 2,936,551 | No | Historical final Sites package |
| `work/crosssignal-simulation-outcome-stage-20260925/` | 3,103,462 | No | Simulation-outcome package |
| `work/crosssignal-synthetic-checkout-stage-20260924/` | 3,098,538 | No | Synthetic-checkout package |
| `work/crosssignal-test-site/` | 0 | Yes | Git-only checkout; repository history is not disposable |
| `work/crosssignal-test-source-open/` | 11,305,576 | Yes | Old source/test checkout, previously included by O TypeScript |

[references.json](references.json) is the original scoped search record.
The October 2 source search independently confirmed the test-source citation
in P `docs/phase4d-synthetic-checkout-harness.md:56`, Sites build imports and A01
stored-result consumers. Earlier absence-of-reference claims are scoped, not
a proof of safe deletion. Existing `before.json`/after/check/dependency/repair
records retain their original bytes and dates.

## Exact export archive proposal — pending review

For each source below the exact destination is O
`_archive/2026-10-01-workspace-exports/work/<same basename>`.
These are the original nine proposals; no destination was created.
Approval would cover only these files, not any directory/repository. Before
execution require unchanged raw hashes (original `before.json` and the current
recheck), absent destinations, a preservation receipt, byte-identical transfer,
and a fresh reference inventory. Stop if a current or historical link would
break until its reviewed plan is explicit. No move/cleanup command is supplied
as an instruction to execute now.

| Source under O `work/` | Bytes |
| --- | ---: |
| `crosssignal-phase4-site.tar.gz` | 1,755,330 |
| `crosssignal-phase4b-site-v2.tar.gz` | 1,758,494 |
| `crosssignal-phase4b-site.tar.gz` | 1,758,279 |
| `crosssignal-phase4c-site-20260924.tar.gz` | 1,760,166 |
| `crosssignal-phase4c-site-final-20260924.tar.gz` | 1,760,334 |
| `crosssignal-simulation-outcome.tar.gz` | 1,912,713 |
| `crosssignal-synthetic-checkout.tar.gz` | 1,911,354 |
| `crosssignal-test-case-decision-v2.tar.gz` | 1,753,198 |
| `crosssignal-test-case-decision.tar.gz` | 1,753,006 |

## Dependency disposition review

**P: no repair remaining.** The current junction is
`C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1/node_modules`
→ `C:/Users/hisha/ChatGPT/CrossSignal/node_modules`.
The [October 1 operation receipt](junction-repair/operation.json) records the
old target and bounded approval. The target exists; ten inspected active/O
package versions match declarations and lockfiles; TypeScript/ESLint and both
editor SDK paths work. That receipt's pending-Spec wording is historical,
not a reason to rerun the repair. Neither the repair nor its evidence is altered.

**Historical test-source: optional proposal only.** Its exact source junction is
`C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-test-source-open/node_modules`;
its current target is
`C:/Users/hisha/OneDrive/Documents/ChatGPT/company flight recorder 2/node_modules`,
verified absent. If a person chooses to make that historical repository runnable,
the proposed replacement target is the existing O `node_modules`. All 26 of
that repository's declared package versions currently match installed packages
and its lockfile. Recheck exact resolved source/target, reparse-point identity,
target absence, all 26 versions and Git state immediately before a reviewed
junction-only replacement. Capture the old target for reversal; remove only the
link without recursion or target traversal, then create only the replacement
link and verify resolution/preservation. Never touch either target's contents.
No installation, download or lockfile change is proposed. Until specifically
reviewed, retain the broken historical link; it does not affect P.

## Other exact physical decisions still open

- **Empty scaffolds:** choose retain or remove only O `benchmarks/` and its 284
  inventoried child directories, O `.sites-package/`, and O `.zcode/` plus its
  one child. A later reviewed operation must verify each resolved path and all
  exact directories still empty, file-free and link-free. No removal now.
- **Generated artifacts:** choose retain, or separately scope removal of O
  `dist/`, O `.vinext/`, O `tsconfig.tsbuildinfo`, P `dist/` and P
  `tsconfig.tsbuildinfo` with an authorized rebuild/check plan. Preserve all
  now. This proposal excludes `build/`, `.openai/`, `.next/`, `.wrangler/`,
  databases and stored results.
- **Protected router:** review the exact O CONTEXT replacement and provenance
  handling in [ENTRY_ROUTER_PROPOSAL.md](ENTRY_ROUTER_PROPOSAL.md). A changed
  expected hash by itself is not a valid review or fresh proof.
- **Packages/repos/source/evidence:** retain in place; no physical move is
  proposed for the nine package directories, either historical repository,
  either application tree, accepted snapshots or stored state.

B01 Build acceptance, conditional provider prerequisites, exact runtime
approval and the preserved SIWC compatibility decision remain separate product
decisions, not cleanup dispositions or approvals granted here.

## Current checks and preservation

The dated recheck is appended to [CHECKS.md](CHECKS.md); its machine detail is in
[recheck-2026-10-02.json](recheck-2026-10-02.json). The entry inventory covers
3,499 O and 1,394 P files, excluding Git metadata and dependency contents;
junctions are recorded and never followed during hashing. This includes
existing cleanup evidence, all archives, B01 preparation, A01 stores, local
Wrangler state and generated bundles/caches. Git branch/HEAD/index digests
are checked separately. No history, database, approval or excluded receipt is
opened for runtime use.

Existing boundaries already meet the requested scope: TypeScript discovers
41 O / 47 P files with no work/archive/planning/output/bundle leakage;
ESLint checks 66 O / 149 P files and retains active source, tests, factory
scripts, examples and the Sites plugin. Editor search excludes historical,
dependency, bundle and result trees; Explorer keeps source/evidence accessible.
Both workspace roots and all SDK paths exist. No config changes are needed.

Full TypeScript reports 17 O / 22 P existing diagnostics; full lint reports
2 O / 4 P existing errors. Their paths/rules/messages match the original
recorded diagnostics; these checks are not claimed green. Exact commands,
local-link checks, Git whitespace checks, derived status and raw preservation
comparison are recorded in CHECKS. No build, replay, migration, stage
preparation, provider/model request, subagent, installation, download,
deployment, LIVE change or runtime intervention was performed.

The [factory rule](../../work/crosssignal-phase1/factory/CONTEXT.md) says:
“Never bypass an unaccepted stage or regenerate accepted artifacts to hide drift.”
The [shared provenance rule](../../work/crosssignal-phase1/factory/_shared/QUALITY_GATES.md)
requires source/reference corrections after human approval. This pass preserves
those bindings and stops with concrete proposals. Both worktrees remain
uncommitted and the active release remains unsealed.
