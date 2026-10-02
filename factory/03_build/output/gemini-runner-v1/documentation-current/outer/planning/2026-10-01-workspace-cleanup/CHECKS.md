# Cleanup result and verification — 2026-10-01

The permitted development cleanup is complete. All physical file dispositions
remain proposals. B01 Stage 01 is still pending human acceptance, and both
repositories retain their original branch, HEAD, index and pre-existing work.

## Changes made

In each repository, changed only `tsconfig.json`, `eslint.config.mjs` and the
current `README.md`. Added one `.vscode/settings.json` per repository and O
`CrossSignal.code-workspace`. The review packet is additional untracked planning
work in O; it is not copied into the product or its factory evidence.

- TypeScript excludes nested work, archives, planning copies, stored outputs,
  generated bundles and `.vinext`. Compiler strictness, aliases and active
  source discovery remain; `.next/types` and `examples/d1` stay included.
- ESLint gains the same development boundaries plus Wrangler/coverage/cache
  exclusions. Its parser root is explicit for each repository. `build/**` is
  no longer ignored, so the active Sites plugin is checked. Rules are unchanged.
- Editor navigation hides dependencies, bundles and build info; routine search
  excludes historical/results trees. Source, migrations, factory and stored
  evidence directories remain accessible in Explorer. Empty O scaffolds are
  hidden. The workspace opens only P and this review packet. Existing shared
  TypeScript 5.9.3 is selected by an explicit local SDK path; no dependency is
  installed or changed.
- O README points to P. P README records the active B01 status and pending gate,
  redirects all six A01 evidence links to their preserved archive, and labels
  historical commands. Accepted historical source documents are unchanged.

## Checks performed

Windows PowerShell / Node v22.15.0. All checking used existing dependencies.
Raw reports contain their UTC timestamps; the review date above uses the
user's Asia/Calcutta date.

| Check | Result / evidence |
| --- | --- |
| Both Git statuses, branches and HEADs | Matched the stated starting state; original index digests and all pre-existing status entries remain, [before.json](before.json), [after.json](after.json) |
| P `node factory/status.mjs` before/after | Stage 01 in progress; gate incomplete, dependencies fresh; Stages 02–05 never run; release unsealed |
| P `node factory/01_spec/verify.mjs` | Exit 0: 30 input bindings, six negative scope checks, 118 archived files unchanged, no historical drift; gate **pending**, model/runtime-human evidence **NOT_RUN**. Read-only; original outputs were not regenerated |
| P targeted `node ../../node_modules/eslint/bin/eslint.js eslint.config.mjs build/sites-vite-plugin.ts factory/01_spec/verify.mjs` | Exit 0 |
| O targeted `node node_modules/eslint/bin/eslint.js eslint.config.mjs build/sites-vite-plugin.ts` | Exit 0 |
| Review utilities, explicit ESLint `--no-ignore` | Exit 0; packet intentionally excluded from normal application lint |
| Config/utility syntax, workspace/editor JSON, folder and SDK paths | Passed; existing SDK files resolve; product folder is the active workspace entry |
| Local links in both current README files | No broken targets, [readme-links.json](readme-links.json) |
| Both `git diff --check` | Exit 0; no whitespace errors |
| Read-only preservation comparison | Passed; exactly three existing files changed per repo, expected three new config/workspace files outside packet; **no files or directories removed**, junctions unchanged, [after.json](after.json) |
| Dependency resolution and declared/locked versions | All ten inspected package versions match; runtime packages resolve through O. Broken P junction remains unchanged, [dependencies.json](dependencies.json) |

## Development diagnostics before and after

The full source checks are **not green**. No lint rule was disabled and no
active source was hidden to make them pass.

| Measurement | O before → after | P before → after |
| --- | ---: | ---: |
| TypeScript discovered root files | 178 → 41 | 62 → 47 |
| Included files under `work/` | 122 → 0 | 0 → 0 |
| Included archived files | 15 → 0 | 15 → 0 |
| Full TypeScript diagnostics / exit | 113 → 17 / exit 2 | 46 → 22 / exit 2 |
| Final lint diagnostics / exit | 2 / exit 1 | 4 / exit 1 |
| Final lint files checked | 66 | 108 |

[checks-before.json](checks-before.json) and [checks-after.json](checks-after.json)
contain compiler discovery, exact typecheck output and direct/editor ESLint
scope checks. The initial direct O lint scanned 1,452 files and reported 39,032
errors, mostly from generated/historical trees. Its second P probe in the same
process hit ambiguous parser-root inference; this is separately identified,
not used as a fresh-process product lint baseline. Explicit parser roots resolve
that ambiguity in the final same-process probe.

[lint-cli-before.json](lint-cli-before.json) and
[lint-cli-after.json](lint-cli-after.json) record the package lint flags in fresh
processes using the existing Node/ESLint executable. P had the same four errors
before and after, with identical paths, rules and messages. O's initial JSON
capture exceeded 16 MiB while traversing generated work bundles; its CLI exit
code is unavailable, and the report does not claim a complete CLI baseline.
The completed direct baseline and final CLI check are sufficient to identify
the boundary correction and the remaining source issues.

Remaining diagnostics are pre-existing:

- O lint: two unused assignments (`demo`, `verification`) in historical
  `factory/05_ship/prepare.mjs:13`.
- P lint: two unused destructured names in `db/case-investigator.mjs:33` and
  two unnecessary backtick escapes in `tests/evaluator/grade-golden-case.mjs:208`.
  Both files' raw hashes are unchanged.
- TypeScript: Cloudflare `cloudflare:workers`, `D1Database` and `Fetcher` types,
  Deno/`npm:postgres` edge-function types, and affected implicit parameters.
  All 22 P diagnostic lines already existed before cleanup. O retains the
  same 17 active failures; the missing `D1Database` diagnostic now suggests
  `IDBDatabase` after nested-source exclusion, rather than adding a new failure.

These are source/runtime typing follow-ups. No product source, evaluator or
historical factory script is altered in this pass. `npm test`, build, migration,
replay and Case tests were not run: their scripts generate bundles or stored
Cases/results and are not needed to verify configuration/document changes.

## Preserved items and remaining review

The raw-byte comparison preserved **4,747 of 4,753 inventoried existing files**;
the only changed six are the intended current configs/README files. This covers
all existing archives, B01 preparation, accepted historical docs, fixtures,
migrations, evaluator files, local state, excluded trial receipt, old planning
packet and unrelated uncommitted work within the inventory's stated bounds.
All **477 `outputs/a01` files** and **118 sealed A01 factory files** are unchanged.
Branches, HEADs and Git index entries remain unchanged. No dependency contents,
runtime database, approval state or append-only history was rewritten; no
file/directory was deleted or relocated.

Remaining decisions are the exact junction-only repair, nine preserving export
moves, empty-scaffold removal, and any future generated-cache removal/rebuild
listed in [MANIFEST.md](MANIFEST.md). Both nonactive nested repositories and both
outer/product application trees stay in place. The protected outer router has
an [exact text proposal](ENTRY_ROUTER_PROPOSAL.md), with no binding/source edit.

B01 acceptance is a separate human decision. The
[Stage 01 contract](../../work/crosssignal-phase1/factory/01_spec/CONTEXT.md) says:
**“Do not begin Data without accepted and fresh gate.”** Nothing here accepts
that gate or grants runtime intervention authority. No subagent, factory restart,
LIVE write, deployment, model call, paid service, install or download occurred.

## Focused clarity recheck — 2026-10-02, Asia/Calcutta

This dated addition preserves the complete October 1 report above as historical
text. The old pending-Spec and broken-P-junction statements describe that earlier
check, not current state. Current classification and physical proposals are in
[MANIFEST.md](MANIFEST.md); this is a workspace review, not factory Build proof.

**Current state:** O remains on `codex/supabase-migration` at
`ca44f2eb180ed2d7d1fba1b606208a3294d4830d`; P remains on
`codex/phase3-decision-ux` at sealed A01 HEAD
`43d42d255bd22cb227e3410dda31ffb8437f6624`, with existing B01 working-tree
changes. P's derived factory result is Spec/Data accepted/fresh, Build in
progress with an incomplete gate, Verify/Ship never run, release unsealed.
Current Build evidence records NOT_RUN for model evaluation and exact human
runtime approval. No inherited provider, activation, repair or runtime operation
was resumed.

**Permitted edits:** O README; P README and CONTEXT; this mutable manifest and
outer-router proposal; this appended check entry. Added only the dated machine
recheck receipt below. O CONTEXT and the unrelated factory note retain their
Spec-protected raw bytes. All development configs, workspace/editor settings,
Git repositories, source/tests and factory artifacts are unchanged by this pass.

| Live check | O | P | Result |
| --- | --- | --- | --- |
| TypeScript default-project discovery | 41 files | 47 files | No files under work/archive/planning/outputs/dist/.vinext; active Sites plugin and examples included |
| TypeScript CLI, no emit/incremental writes | Exit 2, 17 diagnostics | Exit 2, 22 diagnostics | Exact normalized diagnostic output matches the original checks-after record |
| Full ESLint configured scan | 66 files, 2 errors, 0 warnings | 149 files, 4 errors, 0 warnings | Same paths, rules, messages and locations as the original lint-cli-after record |
| ESLint path probes | Active app/plugin/factory/example checkable | Active app/plugin/tests/factory/example checkable | Archive/work/planning/results/bundles/Wrangler are ignored |
| Installed package metadata | 10 match declarations/lock | 10 match declarations/lock | Shared dependency resolution and SDK paths verified |
| Workspace/editor | Existing product + review roots | Product SDK available | Both folder paths and all TypeScript SDK paths exist; no actual boundary gap |
| Read-only factory/Spec | Historical O factory not used for active state | Spec verifier passes all 30 inputs, six negative-scope checks, 118 A01 archive files; no historical drift | Spec gate remains accepted; status derives Build incomplete |
| Git whitespace | Exit 0 | Exit 0 | No whitespace errors; usual line-ending notices do not indicate a failed check |
| Local documentation targets | README/router/review links checked | README/router links checked | All local targets resolve after adding the recheck receipt |

TypeScript was called through the existing Node executable and absolute
`node_modules/typescript/bin/tsc`, with
`--project <repository>/tsconfig.json --noEmit --incremental false`.
Discovery used `readConfigFile` and `parseJsonConfigFileContent`.
ESLint used each existing config and `lintFiles(["."])`, with
`isPathIgnored` probes; no lint cache or autofix was enabled. The full inspection
program and command records are retained in the machine receipt. No package
manager, install, build, replay, Case preparation, migration or model request
was used.

Remaining lint findings are the existing two unused assignments in O's
`factory/05_ship/prepare.mjs:13`, two unused destructured names in P's
`db/case-investigator.mjs:33`, and two unnecessary escapes in P's
`tests/evaluator/grade-golden-case.mjs:208`. Cloudflare/Deno runtime type
declarations and associated implicit parameters still account for the
TypeScript failures. No source/evaluator correction or exclusion was made to
make those checks appear green.

**Rechecked observations:** 428 common tracked paths, 391 normalized identical
including 101 outside archives, 27 different and 10 absent. These are current
file facts; original 19/18 overlap counts remain in their old machine record.
All nine staged packages, both historical repositories, nine exports and four
helpers remain in O work/. Every non-Git/dependency work candidate's current raw
hashes/bytes match the original cleanup inventory. Empty scaffold counts remain
285/1/2 directories with no files/links.

P's dependency junction already targets O node_modules and works; no active
repair remains. The separately preserved historical test-source junction still
targets absent OneDrive dependencies. Its optional junction-only replacement
has a concrete source/target proposal; all 26 historical declared package
versions currently match the existing O installation and its lockfile.
No link was changed. The Git-only test-site has no commits/refs/index entries;
the clean test-source has 461 tracked files on main at
`e07fc0309d13be31a4b86149bf3e645badd3ab04`. Neither repository was initialized
or changed.

**Preservation:** The new entry inventory hashes 3,499 O and 1,394 P files.
Git metadata and dependency contents are excluded, and junctions are never
followed during hashing. The final comparison verifies 4,887 existing files
byte-identical; the only six changed files are the permitted mutable documents
listed above. There are no removed files/directories, no link changes, no lost
pre-existing Git status entries, and no branch/HEAD/index changes. Configs,
source, migrations, fixtures, evaluator files, all existing machine records,
the 118 sealed A01 factory files, 477 stored A01 files, reports, local state,
excluded trial receipt and all current B01/route/amendment preparation retain
their raw hashes. The October 1 text above remains a byte-identical prefix.

[recheck-2026-10-02.json](recheck-2026-10-02.json) stores the full new entry hash
inventory, live inspection program/results, overlap/export observations,
reference/link checks and final preservation comparison. It is additional
development evidence, not a replacement for accepted factory evidence.

**Exact review decisions remaining:** the nine named export moves; optional
historical test-source junction-only replacement; retain/remove the exact empty
scaffolds; separately scope any named generated-cache deletion/rebuild; and the
[protected outer-router replacement/provenance review](ENTRY_ROUTER_PROPOSAL.md).
The manifest contains exact paths and prerequisites. Package directories,
historical repositories, active source and stored evidence remain in place.
No approval is requested or inferred in this pass; Build acceptance, runtime
approval and the pending SIWC compatibility review remain separate decisions.
Both primary repositories remain uncommitted; P remains unsealed.
