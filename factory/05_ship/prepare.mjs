import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  runChecked,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(fromRoot(path), "utf8");

const excludedPrefixes = [
  "_archive/",
  "factory/05_ship/output/",
  "node_modules/",
  ".next/",
  "dist/",
  ".npm-cache/",
];

async function isFile(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function releaseInventory() {
  const result = runChecked(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot },
  );
  const candidates = [...new Set(
    result.stdout
      .split(/\r?\n/)
      .map((path) => path.trim().replaceAll("\\", "/"))
      .filter(Boolean)
      .filter((path) => !excludedPrefixes.some((prefix) => path.startsWith(prefix))),
  )].sort((left, right) => left.localeCompare(right));
  const existing = [];
  for (const path of candidates) {
    if (await isFile(fromRoot(path))) existing.push(path);
  }
  return Promise.all(existing.map(async (path) => ({
    path,
    hash: await fileHash(projectRoot, fromRoot(path)),
  })));
}

function manifestBindingPath(path) {
  return path.startsWith(".") ? `../../../${path}` : path;
}

export async function prepareL14Release() {
  const [report, upstreamGate, manifest, demo, inventory] = await Promise.all([
    read("factory/04_verify/output/VERIFICATION_REPORT.md"),
    read("factory/04_verify/output/HUMAN_GATE.md"),
    read("factory/05_ship/output/RELEASE_MANIFEST.md"),
    read("factory/05_ship/output/DEMO_SCRIPT.md"),
    releaseInventory(),
  ]);

  assert.equal(frontmatterValue(report, "status"), "passed");
  assert.equal(frontmatterValue(report, "truth_mode"), "FIXTURE");
  assert.equal(frontmatterValue(upstreamGate, "gate_status"), "closed");
  assert.equal(frontmatterValue(upstreamGate, "decision"), "accepted");
  assert.equal(frontmatterValue(manifest, "status"), "passed");
  assert.equal(frontmatterValue(manifest, "truth_mode"), "FIXTURE");

  const bindings = new Map(
    markdownHashBindings(manifest).map(({ input, expected }) => [input, expected]),
  );
  assert.equal(bindings.size, inventory.length, "release manifest inventory size drifted");
  for (const item of inventory) {
    assert.equal(
      bindings.get(manifestBindingPath(item.path)),
      item.hash,
      `${item.path} is not bound to its release hash`,
    );
  }

  for (let index = 1; index <= 14; index += 1) {
    assert.ok(manifest.includes(`AC-L14-${String(index).padStart(2, "0")}`));
  }
  for (let index = 1; index <= 12; index += 1) {
    assert.ok(manifest.includes(`NEG-L14-${String(index).padStart(2, "0")}`));
  }
  for (const evidence of [
    "28-event pending",
    "49-event completed",
    "HTTP `401`",
    "HTTP `400`",
    "HTTP `500`",
    "not a deployed or live D1 claim",
  ]) {
    assert.ok(manifest.includes(evidence), `release evidence missing: ${evidence}`);
  }
  for (const command of [
    "npm.cmd' run demo:prepare",
    "tsx.cmd' --test tests/flight-recorder-build.test.mjs",
    "npm.cmd' run lint",
    "npm.cmd' run build",
    "npm.cmd' run start",
    "curl.exe -sS -i",
  ]) {
    assert.ok(demo.includes(command), `cold demo command missing: ${command}`);
  }
  assert.match(demo, /FIXTURE/);
  assert.match(demo, /No repair, fixture regeneration, migration generation, or file edit/);

  return { inventoryCount: inventory.length };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  prepareL14Release()
    .then(({ inventoryCount }) => {
      process.stdout.write(
        `L14 cold release preparation passed: ${inventoryCount} release-head files are hash-bound and the evaluator path requires no hidden repair.\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
