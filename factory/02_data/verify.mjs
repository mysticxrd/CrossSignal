import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHORITY_ERRORS,
  AUTHORITY_FIXTURE_KEY,
  MIGRATION_CASES,
  REQUIRED_ACTIVE_HEAD_STATES,
  buildAuthorityRaceFixture,
  validateAuthorityRaceFixture,
} from "./fixtures/superseded-intent-authority.fixture.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const dataPackagePath = join(projectRoot, "factory/02_data/output/DATA_PACKAGE.md");

const declaredInputs = [
  "factory/02_data/CONTEXT.md",
  "factory/01_spec/output/SPEC.md",
  "factory/01_spec/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "db/flight-recorder-schema.ts",
  "db/migrations.ts",
  "db/flight-recorder.ts",
  "drizzle/0005_flight_recorder_guards.sql",
  "drizzle/meta/0005_snapshot.json",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "factory/02_data/fixtures/onboarding-rescue.fixture.mjs",
  "factory/02_data/fixtures/reset.mjs",
  "package.json",
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeText(bytes, path) {
  return /\.(?:json|md|mjs|sql|ts)$/.test(path)
    ? Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"))
    : bytes;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileHash(path) {
  return sha256(normalizeText(await readFile(path), path));
}

async function walkFiles(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function repositoryPath(path) {
  return relative(projectRoot, path).split(sep).join("/");
}

async function inputHash(input) {
  const absolute = join(projectRoot, input);
  if ((await stat(absolute)).isFile()) return fileHash(absolute);
  const lines = await Promise.all(
    (await walkFiles(absolute))
      .sort((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)))
      .map(async (path) => `${repositoryPath(path)}\0${await fileHash(path)}\n`),
  );
  return sha256(Buffer.from(lines.join("")));
}

export async function computeDeclaredInputHashes() {
  return Object.fromEntries(
    await Promise.all(declaredInputs.map(async (input) => [input, await inputHash(input)])),
  );
}

function declaredHashMap(markdown) {
  return new Map(
    [...markdown.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)]
      .map((match) => [match[1], match[2]]),
  );
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? null;
}

export async function verifyDataPackage({ checkDeclaredHashes = true } = {}) {
  const [dataPackage, spec, specGate, schema, migrations, runtime, guards, dataTest, buildTest, fixtureSource] = await Promise.all([
    readFile(dataPackagePath, "utf8"),
    readFile(join(projectRoot, "factory/01_spec/output/SPEC.md"), "utf8"),
    readFile(join(projectRoot, "factory/01_spec/output/HUMAN_GATE.md"), "utf8"),
    readFile(join(projectRoot, "db/flight-recorder-schema.ts"), "utf8"),
    readFile(join(projectRoot, "db/migrations.ts"), "utf8"),
    readFile(join(projectRoot, "db/flight-recorder.ts"), "utf8"),
    readFile(join(projectRoot, "drizzle/0005_flight_recorder_guards.sql"), "utf8"),
    readFile(join(projectRoot, "tests/flight-recorder-data.test.mjs"), "utf8"),
    readFile(join(projectRoot, "tests/flight-recorder-build.test.mjs"), "utf8"),
    readFile(join(projectRoot, "factory/02_data/fixtures/superseded-intent-authority.fixture.mjs"), "utf8"),
  ]);

  invariant(frontmatterValue(specGate, "gate_status") === "closed", "Stage 01 gate is not closed");
  invariant(frontmatterValue(specGate, "decision") === "accepted", "Stage 01 gate is not accepted");
  invariant(frontmatterValue(specGate, "spec_sha256") === sha256(Buffer.from(spec.replace(/\r\n?/g, "\n"))), "Stage 01 gate does not bind the current specification");
  invariant(frontmatterValue(dataPackage, "status") === "ready-for-review", "Data Package is not ready for review");
  invariant(frontmatterValue(dataPackage, "finding") === "L08", "Data Package is not scoped to L08");
  invariant(frontmatterValue(dataPackage, "fixture_key") === AUTHORITY_FIXTURE_KEY, "Data Package fixture key drifted");

  invariant(!schema.includes("activeIntentId"), "Stage 02 must not implement the product schema");
  invariant(!schema.includes("supersedesIntentId"), "Stage 02 must not implement the predecessor edge");
  invariant(!migrations.includes("idx_flight_traces_workspace_active_intent"), "Stage 02 must not alter migration compatibility checks");
  invariant(/ORDER BY created_at DESC, rowid DESC LIMIT 1/.test(runtime), "sealed active-intent inference baseline was not found");
  invariant(/batch\(\[intentStatement\(next\.intent\), policyStatement\(next\.policyDecision\)\]\)/.test(runtime), "sealed replacement batch baseline was not found");
  invariant(/current_state = 'awaiting_approval'/.test(runtime), "sealed authorization state check baseline was not found");
  invariant(/trg_approval_grants_bind_authority/.test(guards), "sealed approval guard baseline was not found");
  invariant(/trg_effect_attempts_bind_grant/.test(guards), "sealed effect guard baseline was not found");
  invariant(/editing creates a new immutable intent/.test(buildTest), "existing edit test baseline was not found");
  invariant(/migration enforces workspace ownership/.test(dataTest), "existing migration test baseline was not found");

  const fixture = buildAuthorityRaceFixture();
  const fixtureErrors = validateAuthorityRaceFixture(fixture);
  invariant(fixtureErrors.length === 0, fixtureErrors.join("; "));
  invariant(!/setTimeout|Math\.random/.test(fixtureSource), "race fixture uses nondeterministic scheduling");
  invariant(MIGRATION_CASES.length === 5, "migration matrix must contain exactly five canonical cases");
  invariant(REQUIRED_ACTIVE_HEAD_STATES.length === 4, "required active-head state set drifted");

  for (const token of [
    "active_intent_id",
    "supersedes_intent_id",
    "idx_flight_traces_workspace_active_intent",
    "idx_action_intents_one_successor",
    "trg_policy_decisions_activate_intent",
    "trg_flight_traces_active_intent_transition",
    "trg_approval_grants_bind_active_intent",
    "trg_effect_attempts_bind_active_intent",
    "trg_flight_trace_events_executing_projection",
    "after-active-intent-and-policy-load-before-write-batch",
    "AC-L08-01",
    "AC-L08-08",
    "L06",
    "L20",
    "L04",
    "L14",
    ...Object.values(AUTHORITY_ERRORS),
  ]) invariant(dataPackage.includes(token), `Data Package is missing required contract token: ${token}`);

  const actualHashes = await computeDeclaredInputHashes();
  if (checkDeclaredHashes) {
    const declaredHashes = declaredHashMap(dataPackage);
    invariant(declaredHashes.size === declaredInputs.length, "Data Package declared-input table is incomplete");
    for (const [input, actual] of Object.entries(actualHashes)) {
      invariant(declaredHashes.get(input) === actual, `declared input hash drifted: ${input}`);
    }
  }

  return {
    status: "passed",
    finding: "L08",
    fixtureKey: fixture.fixtureKey,
    deterministicSchedules: Object.keys(fixture.schedules).length,
    directDatabaseAttacks: fixture.directDatabaseAttacks.length,
    migrationCases: MIGRATION_CASES.length,
    requiredActiveHeadStates: REQUIRED_ACTIVE_HEAD_STATES.length,
    declaredInputs: declaredInputs.length,
    inputHashes: actualHashes,
  };
}

if (process.argv.includes("--print-input-hashes")) {
  console.log(JSON.stringify(await computeDeclaredInputHashes(), null, 2));
} else {
  console.log(JSON.stringify(await verifyDataPackage(), null, 2));
}
