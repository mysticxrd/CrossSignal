import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

function run(command, args) {
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, { cwd: root, encoding: "utf8", timeout: 120_000 });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout;
}

async function hash(path) {
  return createHash("sha256").update((await readFile(path, "utf8")).replaceAll("\r\n", "\n")).digest("hex");
}

async function directoryHash(path) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const next = join(current, entry.name);
      if (entry.isDirectory()) await visit(next);
      else if (entry.isFile()) files.push(next);
    }
  }
  await visit(path);
  const manifest = [];
  for (const file of files.toSorted()) {
    const relative = file.slice(root.length + 1).replaceAll("\\", "/");
    manifest.push(`${relative}\0${await hash(file)}\n`);
  }
  return createHash("sha256").update(manifest.join("")).digest("hex");
}

async function inputHash(relative) {
  const absolute = join(root, relative);
  return (await stat(absolute)).isDirectory() ? directoryHash(absolute) : hash(absolute);
}

const [ui, repository, actions, types, dataGate] = await Promise.all([
  readFile(join(root, "app/CrossSignalApp.tsx"), "utf8"),
  readFile(join(root, "db/flight-recorder.ts"), "utf8"),
  readFile(join(root, "app/flight-recorder-actions.ts"), "utf8"),
  readFile(join(root, "app/flight-recorder-types.ts"), "utf8"),
  readFile(join(root, "factory/02_data/output/HUMAN_GATE.md"), "utf8"),
]);

assert.match(dataGate, /decision: accepted/);
assert.match(ui, /Nothing happens/);
assert.match(ui, /exact proposed action/);
assert.match(ui, /SPENDING CAP/);
assert.match(ui, /Pause all actions/);
assert.match(ui, /Evidence used/i);
assert.match(ui, /CHALLENGE \/ SKEPTIC REVIEW/);
assert.match(ui, /HUMAN AUTHORIZATION/);
assert.match(ui, /EXECUTION RESULT/);
assert.match(ui, /OBSERVED BUSINESS OUTCOME/);
assert.match(ui, /Correlated/);
assert.match(ui, /Proven/);
assert.match(ui, /single-user screen does not visually prove tenant isolation/);
assert.match(repository, /validatePersistedActionIntent/);
assert.match(repository, /assertExecutionAuthority/);
assert.match(repository, /killSwitchEngaged/);
assert.match(repository, /priorAttemptCount/);
assert.match(repository, /retryAttempted: false/);
assert.match(actions, /getCrossSignalUser/);
assert.match(types, /"indeterminate"/);

const tests = run(process.execPath, ["--import", "tsx", "--test", "tests/flight-recorder-build.test.mjs"]);
assert.match(tests, /pass 6/);

const declaredInputPaths = [
  "factory/03_build/CONTEXT.md",
  "factory/01_spec/output/SPEC.md",
  "factory/02_data/output/DATA_PACKAGE.md",
  "factory/02_data/output/VERIFY.md",
  "factory/02_data/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "app",
  "db",
  "drizzle",
  "worker",
  "tests",
];
const declaredInputs = Object.fromEntries(
  await Promise.all(declaredInputPaths.map(async (path) => [path, await inputHash(path)])),
);

console.log(JSON.stringify({
  status: "passed",
  focusedTests: 6,
  traceContract: "context -> reviewed playbook -> intent -> policy -> exact approval -> effect -> observation",
  safetyStates: ["confirmed", "failed", "indeterminate-no-retry"],
  declaredInputs,
  hashes: {
    ui: await hash(join(root, "app/CrossSignalApp.tsx")),
    repository: await hash(join(root, "db/flight-recorder.ts")),
    actions: await hash(join(root, "app/flight-recorder-actions.ts")),
    buildTests: await hash(join(root, "tests/flight-recorder-build.test.mjs")),
  },
}, null, 2));
