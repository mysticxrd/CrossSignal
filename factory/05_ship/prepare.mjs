import { resolve } from "node:path";

import { pathHash, runChecked } from "../_lib/verify-kit.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");

export const RELEASE_BINDING_PATHS = Object.freeze([
  "factory/05_ship/CONTEXT.md",
  "factory/04_verify/output/PRIMARY.md",
  "factory/04_verify/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "factory/_lib/verify-kit.mjs",
  "factory/_lib/factory-state.mjs",
  "factory/status.mjs",
  "factory/seal.mjs",
  "factory/CONTEXT.md",
  "factory/01_spec",
  "factory/02_data",
  "factory/03_build",
  "factory/04_verify",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph-definition.ts",
  "db/flight-recorder-graph.ts",
  "db/flight-recorder.ts",
  "tests/fixtures/persisted-graph-executor.fixture.mjs",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
]);

export function candidatePaths(statusOutput) {
  return statusOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replaceAll("\\", "/"))
    .filter((path) => !path.startsWith("factory/05_ship/"))
    .sort();
}

export async function prepareReleaseCandidate() {
  const bindings = Object.fromEntries(await Promise.all(
    RELEASE_BINDING_PATHS.map(async (path) => [
      path,
      await pathHash(projectRoot, resolve(projectRoot, path)),
    ]),
  ));
  const status = runChecked("git", ["status", "--porcelain=v1"], { cwd: projectRoot });
  const head = runChecked("git", ["rev-parse", "HEAD"], { cwd: projectRoot });
  const branch = runChecked("git", ["branch", "--show-current"], { cwd: projectRoot });
  const stashes = runChecked("git", ["stash", "list"], { cwd: projectRoot });
  return {
    branch: branch.stdout.trim(),
    candidatePaths: candidatePaths(status.stdout),
    head: head.stdout.trim(),
    bindings,
    stashes: stashes.stdout.split(/\r?\n/).filter(Boolean),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  process.stdout.write(`${JSON.stringify(await prepareReleaseCandidate(), null, 2)}\n`);
}
