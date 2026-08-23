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
  const executable =
    process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 180_000,
  });
  assert.equal(
    result.status,
    0,
    command +
      " " +
      args.join(" ") +
      " failed:\n" +
      (result.error?.message ?? result.stderr ?? result.stdout),
  );
  return result.stdout;
}

function repositoryPath(path) {
  return relative(root, path).split(sep).join("/");
}

async function fileHash(path) {
  const bytes = await readFile(path);
  return createHash("sha256")
    .update(
      textPattern.test(repositoryPath(path))
        ? Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"))
        : bytes,
    )
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
      .toSorted((left, right) =>
        repositoryPath(left).localeCompare(repositoryPath(right)),
      )
      .map(
        async (path) =>
          repositoryPath(path) + "\0" + (await fileHash(path)) + "\n",
      ),
  );
  return createHash("sha256").update(lines.join("")).digest("hex");
}

function frontmatterHash(text, field) {
  const match = text.match(
    new RegExp("^" + field + ": ([0-9a-f]{64})$", "m"),
  );
  assert.ok(match, "missing " + field);
  return match[1];
}

const [manifest, demoScript, releaseReport, releaseVerify, releaseGate, readme] =
  await Promise.all([
    readFile(join(root, "factory/05_ship/output/RELEASE_MANIFEST.md"), "utf8"),
    readFile(join(root, "factory/05_ship/output/DEMO_SCRIPT.md"), "utf8"),
    readFile(
      join(root, "factory/04_verify/output/VERIFICATION_REPORT.md"),
      "utf8",
    ),
    readFile(join(root, "factory/04_verify/output/VERIFY.md"), "utf8"),
    readFile(join(root, "factory/04_verify/output/HUMAN_GATE.md"), "utf8"),
    readFile(join(root, "README.md"), "utf8"),
  ]);

assert.match(releaseReport, /^status: ready-for-review$/m);
assert.match(releaseVerify, /^status: passed$/m);
assert.match(releaseGate, /^gate_status: closed$/m);
assert.match(releaseGate, /^decision: accepted$/m);
assert.equal(
  frontmatterHash(releaseGate, "verification_report_sha256"),
  await fileHash(
    join(root, "factory/04_verify/output/VERIFICATION_REPORT.md"),
  ),
  "accepted verification report hash drifted",
);
assert.equal(
  frontmatterHash(releaseGate, "verification_sha256"),
  await fileHash(join(root, "factory/04_verify/output/VERIFY.md")),
  "accepted verification hash drifted",
);

assert.match(manifest, /^status: ready-for-review$/m);
assert.match(manifest, /^truth_mode: FIXTURE$/m);
assert.match(manifest, /^effect_mode: TEST$/m);
assert.match(demoScript, /^status: ready-for-review$/m);
assert.match(demoScript, /^truth_mode: FIXTURE$/m);
assert.match(demoScript, /^effect_mode: TEST$/m);
assert.match(readme, /npm run verify:ship/);

const screenshotBindings = [
  ...releaseReport.matchAll(
    /\| `\d{2}` \| `(screenshots\/[^`]+\.png)`[^|]+\| `([0-9a-f]{64})` \|/g,
  ),
];
assert.equal(
  screenshotBindings.length,
  6,
  "Verify report must bind six screenshots",
);
for (const [, screenshot, expected] of screenshotBindings) {
  assert.equal(
    await fileHash(join(root, "factory/04_verify/output", screenshot)),
    expected,
    "screenshot hash drift: " + screenshot,
  );
}

const shipScreenshotBindings = [
  ...manifest.matchAll(
    /\]\((screenshots\/[^)]+\.png)\)[^|]+\| `([0-9a-f]{64})` \|/g,
  ),
];
assert.equal(
  shipScreenshotBindings.length,
  5,
  "Ship manifest must bind five cold-review screenshots",
);
for (const [, screenshot, expected] of shipScreenshotBindings) {
  assert.equal(
    await fileHash(join(root, "factory/05_ship/output", screenshot)),
    expected,
    "ship screenshot hash drift: " + screenshot,
  );
}

run(process.execPath, [
  "--import",
  "tsx",
  "factory/04_verify/verify.mjs",
]);
const shipFocused = run(process.execPath, [
  "--import",
  "tsx",
  "--test",
  "tests/flight-recorder-ship.test.mjs",
]);
assert.match(shipFocused, /pass 5/);

const declaredInputPaths = [
  "factory/05_ship/CONTEXT.md",
  "factory/01_spec/output/SPEC.md",
  "factory/04_verify/output/VERIFICATION_REPORT.md",
  "factory/04_verify/output/VERIFY.md",
  "factory/04_verify/output/HUMAN_GATE.md",
  "factory/03_build/output/BUILD_EVIDENCE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "README.md",
  "package.json",
  "app",
  "db",
  "drizzle",
  "tests",
];
const declaredInputs = Object.fromEntries(
  await Promise.all(
    declaredInputPaths.map(async (path) => [path, await inputHash(path)]),
  ),
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      releaseId: "crosssignal-onboarding-rescue-evaluator-v1",
      traceId: "trace_d12fc25947ed88cd",
      truthMode: "FIXTURE",
      effectMode: "TEST",
      acceptedVerifyGate: true,
      releaseAcceptanceCriteria: 8,
      releaseFocusedTests: 21,
      shipFocusedTests: 5,
      verifiedUpstreamScreenshots: screenshotBindings.length,
      verifiedShipScreenshots: shipScreenshotBindings.length,
      declaredInputs,
      releaseArtifacts: {
        manifest: await fileHash(
          join(root, "factory/05_ship/output/RELEASE_MANIFEST.md"),
        ),
        demoScript: await fileHash(
          join(root, "factory/05_ship/output/DEMO_SCRIPT.md"),
        ),
        readme: await fileHash(join(root, "README.md")),
        package: await fileHash(join(root, "package.json")),
        prepare: await fileHash(join(root, "factory/05_ship/prepare.mjs")),
        shipTests: await fileHash(
          join(root, "tests/flight-recorder-ship.test.mjs"),
        ),
      },
    },
    null,
    2,
  ),
);
