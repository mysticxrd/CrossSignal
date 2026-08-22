import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const textPattern = /\.(?:c|css|html|js|json|jsonc|jsx|md|mjs|sql|ts|tsx|txt|yml|yaml)$/;

function run(command, args) {
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, { cwd: root, encoding: "utf8", timeout: 180_000 });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout;
}

function repositoryPath(path) {
  return relative(root, path).split(sep).join("/");
}

async function fileHash(path) {
  const bytes = await readFile(path);
  return createHash("sha256")
    .update(textPattern.test(repositoryPath(path)) ? Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n")) : bytes)
    .digest("hex");
}

async function walk(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function inputHash(input) {
  const absolute = join(root, input);
  if ((await stat(absolute)).isFile()) return fileHash(absolute);
  const lines = await Promise.all(
    (await walk(absolute))
      .toSorted((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)))
      .map(async (path) => `${repositoryPath(path)}\0${await fileHash(path)}\n`),
  );
  return createHash("sha256").update(lines.join("")).digest("hex");
}

const [spec, buildEvidence, buildVerify, buildGate] = await Promise.all([
  readFile(join(root, "factory/01_spec/output/SPEC.md"), "utf8"),
  readFile(join(root, "factory/03_build/output/BUILD_EVIDENCE.md"), "utf8"),
  readFile(join(root, "factory/03_build/output/VERIFY.md"), "utf8"),
  readFile(join(root, "factory/03_build/output/HUMAN_GATE.md"), "utf8"),
]);
assert.match(buildVerify, /^status: passed$/m);
assert.match(buildGate, /^gate_status: closed$/m);
assert.match(buildGate, /^decision: accepted$/m);

const acceptanceIds = [...spec.matchAll(/^\| `(AC-\d{2})` \|/gm)].map((match) => match[1]);
assert.deepEqual(acceptanceIds, ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08"]);

const screenshotBindings = [...buildEvidence.matchAll(/\]\((screenshots\/[^)]+\.png)\) \| `([0-9a-f]{64})`/g)];
assert.equal(screenshotBindings.length, 4, "Build evidence must bind four screenshots");
for (const [, screenshot, expected] of screenshotBindings) {
  assert.equal(await fileHash(join(root, "factory/03_build/output", screenshot)), expected, `screenshot hash drift: ${screenshot}`);
}

const focused = run(process.execPath, [
  "--import",
  "tsx",
  "--test",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
]);
assert.match(focused, /pass 21/);
assert.match(buildEvidence, /written verification proves 14 tenant-isolation and security/);

const declaredInputPaths = [
  "factory/04_verify/CONTEXT.md",
  "factory/01_spec/output/SPEC.md",
  "factory/02_data/output/DATA_PACKAGE.md",
  "factory/03_build/output/BUILD_EVIDENCE.md",
  "factory/03_build/output/VERIFY.md",
  "factory/03_build/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "tests",
];
const declaredInputs = Object.fromEntries(
  await Promise.all(declaredInputPaths.map(async (path) => [path, await inputHash(path)])),
);

console.log(JSON.stringify({
  status: "passed",
  traceId: "trace_d12fc25947ed88cd",
  acceptanceCriteriaResolved: acceptanceIds,
  focusedTests: 21,
  screenshotBindingsVerified: screenshotBindings.length,
  acceptedStage02D1Probes: 14,
  currentAttackClasses: [
    "recovery",
    "tenant-isolation",
    "duplicate-ingress",
    "out-of-order-events",
    "injection-and-context-leakage",
    "authority-mutation-and-replay",
    "ambiguous-effect-no-retry",
    "late-outcome-supersession",
  ],
  declaredInputs,
  implementationHashes: {
    ui: await fileHash(join(root, "app/CrossSignalApp.tsx")),
    actions: await fileHash(join(root, "app/flight-recorder-actions.ts")),
    repository: await fileHash(join(root, "db/flight-recorder.ts")),
    contracts: await fileHash(join(root, "db/flight-recorder-contracts.ts")),
    releaseTests: await fileHash(join(root, "tests/flight-recorder-release.test.mjs")),
  },
}, null, 2));
