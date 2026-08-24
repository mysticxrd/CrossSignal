import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  markdownHashBindings,
  markdownSection,
  pathHash,
  runChecked,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const specPath = resolve(projectRoot, "factory/01_spec/output/SPEC.md");
const sealedRelease = "7b07ff62b2c0de605c86b378a1b90639f4b90547";

// Durable workspace tests exercise the original generic validator as a
// factory fail-closed contract, so this export remains compatible.
const legacyHeadings = [
  "## Relationship to Result",
  "## Public evidence",
  "## Product definition",
  "## Primary user and problem",
  "## Golden path",
  "## Scope",
  "## Acceptance criteria",
  "## Current repository truth",
  "## Evaluator thesis",
  "## Explicit non-claims",
];
const legacySources = [
  "https://www.result.dev/",
  "https://www.result.dev/thesis",
  "https://www.ycombinator.com/companies/result",
  "https://lab.result.dev/",
];
const unsupportedClaims = [
  /\bResult-native\b/i,
  /\bResult (?:Postgres|Function|Email|Analytics|AI|SDK\/CLI)\b/,
  /docs\.result\.dev/i,
  /owner-authorized Result test workspace/i,
];
const secretPatterns = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}/,
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}/,
  /\bgh[oprsu]_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function validateSpec(text) {
  const errors = [];
  if (typeof text !== "string" || text.trim().length === 0) {
    return ["specification must be non-empty Markdown"];
  }
  for (const heading of legacyHeadings) {
    if (!text.includes(heading)) errors.push(`missing heading: ${heading}`);
  }
  for (const source of legacySources) {
    if (!text.includes(source)) errors.push(`missing public source: ${source}`);
  }
  for (const label of ["Public fact", "Inference", "Unknown / non-claim"]) {
    if (!text.includes(label)) errors.push(`missing evidence label: ${label}`);
  }
  for (const required of [
    /target company and evaluation audience/i,
    /standalone/i,
    /Company Brain/i,
    /FIXTURE/i,
    /02_data/i,
    /AC-01/,
    /AC-08/,
  ]) {
    if (!required.test(text)) errors.push(`missing required specification statement: ${required}`);
  }
  for (const forbidden of unsupportedClaims) {
    if (forbidden.test(text)) errors.push(`contains unsupported Result claim: ${forbidden}`);
  }
  for (const secret of secretPatterns) {
    if (secret.test(text)) errors.push(`contains forbidden secret pattern: ${secret}`);
  }
  return errors;
}

const correctionHeadings = [
  "## Declared input hashes",
  "## Executive decision",
  "## Confirmed defect",
  "## Authority invariant",
  "## Atomic enforcement boundary",
  "## Data model and runtime reads",
  "## Migration and backfill",
  "## Deterministic interleaving test",
  "## Acceptance criteria",
  "## Compatibility and rollback",
  "## Scope and non-goals",
  "## External evidence",
  "## Risks resolved by this specification",
];

const requiredBindings = [
  "factory/01_spec/CONTEXT.md",
  "factory/_lib/factory-tools.test.mjs",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "db/flight-recorder.ts",
  "db/flight-recorder-schema.ts",
  "db/migrations.ts",
  "drizzle/",
  "tests/",
  "package.json",
];

export function validateCorrectionSpec(text) {
  const errors = [];
  if (typeof text !== "string" || text.trim().length === 0) {
    return ["correction specification must be non-empty Markdown"];
  }
  for (const heading of correctionHeadings) {
    if (!text.includes(heading)) errors.push(`missing heading: ${heading}`);
  }
  for (const required of [
    /flight_traces\.active_intent_id/,
    /current_state = 'awaiting_approval'/,
    /grant insert is the authorization linearization point/i,
    /zero-row\s+compare-and-swap is not sufficient/i,
    /rolls? back/i,
    /created_at DESC, rowid DESC/,
    /manual promise barrier or two controlled database connections/i,
    /no sleeps or probabilistic race loops/i,
    /AC-L08-01/,
    /AC-L08-08/,
    /L06 runtime reasoning-graph executor/,
    /L20 fixture\/runtime source-of-truth drift/,
    /L14 trace endpoint/,
    /2026-08-22/,
    /https:\/\/developers\.cloudflare\.com\/d1\/worker-api\/d1-database\/#batch/,
    /https:\/\/www\.sqlite\.org\/foreignkeys\.html/,
  ]) {
    if (!required.test(text)) errors.push(`missing required correction statement: ${required}`);
  }
  if (/another pre-batch “latest intent” query is (?:allowed|required)/i.test(text)) {
    errors.push("specification permits the rejected check-then-act design");
  }
  for (const secret of secretPatterns) {
    if (secret.test(text)) errors.push(`contains forbidden secret pattern: ${secret}`);
  }
  return errors;
}

async function validateBindings(text) {
  const section = markdownSection(text, /^## Declared input hashes$/);
  const bindings = markdownHashBindings(section);
  const byPath = new Map(bindings.map((binding) => [binding.input, binding.expected]));
  const errors = [];
  for (const input of requiredBindings) {
    const expected = byPath.get(input);
    if (!expected) {
      errors.push(`missing declared input hash: ${input}`);
      continue;
    }
    const cleaned = input.replace(/[\\/]$/, "");
    const actual = await pathHash(projectRoot, resolve(projectRoot, cleaned));
    if (actual !== expected) errors.push(`stale declared input hash: ${input}`);
  }
  for (const input of byPath.keys()) {
    if (!requiredBindings.includes(input)) errors.push(`undeclared or unexpected input binding: ${input}`);
  }
  return errors;
}

async function main() {
  const spec = await readFile(specPath, "utf8");
  const errors = [
    ...validateCorrectionSpec(spec),
    ...(await validateBindings(spec)),
  ];
  if (!spec.includes(sealedRelease)) errors.push("missing sealed release binding");

  runChecked("git", ["cat-file", "-e", `${sealedRelease}^{commit}`], { cwd: projectRoot });
  const productDiff = runChecked(
    "git",
    ["diff", "--name-only", "--", "app", "db", "drizzle", "worker"],
    { cwd: projectRoot },
  ).stdout.trim();
  if (productDiff) errors.push(`Stage 01 changed product paths: ${productDiff}`);
  const testDiff = runChecked(
    "git",
    ["diff", "--name-only", "--", "tests"],
    { cwd: projectRoot },
  ).stdout.trim().split(/\r?\n/).filter(Boolean);
  const unexpectedTests = testDiff.filter((path) => path !== "tests/icm-workspace.test.mjs");
  if (unexpectedTests.length > 0) {
    errors.push(`Stage 01 changed unexpected test paths: ${unexpectedTests.join(", ")}`);
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(`${JSON.stringify({
    status: "passed",
    artifact: "factory/01_spec/output/SPEC.md",
    finding: "L08",
    acceptanceCriteria: 8,
    declaredInputs: requiredBindings.length,
    productPathsChanged: 0,
    factoryHarnessCorrections: 2,
    sealedRelease,
  }, null, 2)}\n`);
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedUrl === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
