---
unit: a01-synthetic-revenue-investigation
stage: 05_ship
status: passed
verified_at: 2026-09-29T05:56:35.083Z
---

# Ship packaging verification

Environment: v22.15.0, win32/x64. See
[commands.json](commands.json) for exact commands, start/end UTC, exit codes and
runtime warnings. No installation, hosted migration, model call or deployment.

1. node factory/04_verify/verify.mjs — PASS; accepted and fresh upstream evidence.
2. node --experimental-strip-types scripts/run-a01.mjs — PASS; five branches
   repeated in ten fresh processes/stores; identical to accepted Verify hashes.
3. node --experimental-strip-types --test tests/a01-release.test.mjs — 4 PASS,
   0 failures; [TAP](release-tests.tap), including 40 mutated authority fields.
4. node factory/05_ship/verify.mjs — validates complete coverage, independent
   grades, hash references, current upstream, truth labels and pending gate.

Accepted app build, 18 integrated checks and 19 regressions are carried forward
by exact unchanged source/evidence bindings. Only Ship tooling/documentation
changed. Historical Build's single grader-source correction remains documented
and verified by Stage 04. Full model/human-runtime proof remains NOT_RUN.

The package preparer writes an open gate; a human owns acceptance. Separate lint
and git diff --check are required before handoff. No release is sealed yet.

The initial packaging assertion required uppercase SIMULATED in an existing
report titled "simulated Case". The replay and all tests had passed; the new
packaging check was corrected to accept casing. Product code and accepted
reports were preserved, and the final package was regenerated and verified.

## Final handoff checks

2026-09-29T05:57:21.956Z — node ../../node_modules/eslint/bin/eslint.js factory/05_ship/prepare.mjs factory/05_ship/verify.mjs: exit 0, no findings. git diff --check: exit 0. Stage 05 verification: 637 covered files, five cold branches and four release tests PASS. No product changes.

Root dotfile bindings were adjusted to output-relative paths to match the shared factory resolver. Shared status and the Ship verifier now both require fresh release-head coverage. No shared tooling or product code changed.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/05_ship/output/RELEASE_MANIFEST.md` | `3ae5a01cfa442f66d42c6aeb97fac5c17159be4f83235e212ce9597f0b90a542` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `8b3a6b1ae9b99f207b6cb90dd3dfbcb6718fd2d0945074d1e178a8acf8176bf8` |
