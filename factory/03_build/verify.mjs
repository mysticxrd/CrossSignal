import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const fromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(fromRoot(path), "utf8");

const [
  previousGate,
  buildEvidence,
  verification,
  humanGate,
  packageJsonText,
  databaseBoundary,
  resolver,
  supabaseReader,
  initialMigration,
  subjectBindingMigration,
  advisorMigration,
  sqlTests,
] = await Promise.all([
  read("factory/02_data/output/HUMAN_GATE.md"),
  read("factory/03_build/output/BUILD_EVIDENCE.md"),
  read("factory/03_build/output/VERIFY.md"),
  read("factory/03_build/output/HUMAN_GATE.md"),
  read("package.json"),
  read("db/index.ts"),
  read("db/trace-resolution.ts"),
  read("db/supabase-trace-resolution.ts"),
  read("supabase/migrations/202609080001_trace_resolution_read_model.sql"),
  read("supabase/migrations/202609080002_fix_trace_subject_binding.sql"),
  read("supabase/migrations/202609080003_optimize_trace_read_model.sql"),
  read("supabase/tests/trace_resolution_read_model.sql"),
]);

assert.equal(frontmatterValue(previousGate, "decision"), "accepted", "Stage 02 gate is not accepted");
assert.equal(frontmatterValue(buildEvidence, "stage"), "03_build");
assert.equal(frontmatterValue(buildEvidence, "status"), "proposed");
assert.match(buildEvidence, /tonuxepirauyqcwbwenw/);
assert.match(buildEvidence, /2 workspaces, 2 workspace members, 2 traces, and 77 events/);
assert.match(buildEvidence, /pendingEvents.*28|28-event pending trace/s);
assert.match(buildEvidence, /completedEvents.*49|49-event completed trace/s);
assert.match(buildEvidence, /cross-tenant.*not_found/i);
assert.match(buildEvidence, /six.*Unused Index.*INFO/is);
assert.doesNotMatch(buildEvidence, /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i, "connection secret leaked into evidence");

for (const { input, expected } of markdownHashBindings(buildEvidence)) {
  assert.equal(
    await fileHash(projectRoot, fromRoot(input)),
    expected,
    `hash drifted for ${input}`,
  );
}

const packageJson = JSON.parse(packageJsonText);
assert.equal(packageJson.dependencies.postgres, "3.4.9");
assert.match(packageJson.scripts["verify:build"], /supabase-trace-resolution\.test\.mjs/);
assert.match(databaseBoundary, /CFR_DATABASE_PROVIDER/);
assert.match(databaseBoundary, /SUPABASE_DATABASE_URL/);
assert.match(databaseBoundary, /parsed\.port !== "6543"/);
assert.match(databaseBoundary, /\.pooler\.supabase\.com/);
assert.match(resolver, /provider === "d1"/);
assert.match(resolver, /resolveFlightTraceFromSupabase/);
assert.match(supabaseReader, /prepare: false/);
assert.match(supabaseReader, /max: 1/);
assert.match(supabaseReader, /ssl: "require"/);
assert.match(supabaseReader, /set transaction read only/);
assert.match(supabaseReader, /app\.current_user_id/);
assert.match(supabaseReader, /app\.current_workspace_id/);

assert.equal((initialMigration.match(/force row level security/g) ?? []).length, 4);
assert.equal((initialMigration.match(/create policy /g) ?? []).length, 4);
assert.match(initialMigration, /grant cfr_trace_reader to postgres;/);
assert.match(initialMigration, /bound_trace_subject/);
assert.match(initialMigration, /nullif\(\(select current_setting/);
assert.match(subjectBindingMigration, /bound_trace_subject/);
assert.match(advisorMigration, /idx_workspaces_owner_membership/);
assert.match(advisorMigration, /idx_flight_traces_workspace_creator/);
assert.equal((advisorMigration.match(/drop policy /g) ?? []).length, 4);
assert.equal((advisorMigration.match(/create policy /g) ?? []).length, 4);

assert.match(sqlTests, /set local role cfr_trace_reader/);
assert.match(sqlTests, /owner A can see owner B trace/);
assert.match(sqlTests, /owner B can see owner A trace/);
assert.match(sqlTests, /missing tenant context returned rows/);
assert.match(sqlTests, /reader mutation unexpectedly succeeded/);
assert.match(sqlTests, /sequence gap unexpectedly succeeded/);
assert.match(sqlTests, /foreign trace subject unexpectedly succeeded/);
assert.match(sqlTests, /event update unexpectedly succeeded/);
assert.equal((sqlTests.match(/^rollback;$/gm) ?? []).length, 3);

assert.equal(frontmatterValue(verification, "status"), "passed");
assert.match(verification, /Exit code: `0`/);
assert.match(verification, /63 tests passed/);
assert.match(verification, /pendingEvents.*28/);
assert.match(verification, /completedEvents.*49/);
assert.match(verification, /crossTenant.*not_found/);

const buildGateStatus = frontmatterValue(humanGate, "gate_status");
const buildGateDecision = frontmatterValue(humanGate, "decision");
assert.ok(
  (buildGateStatus === "open" && buildGateDecision === "pending") ||
    (buildGateStatus === "closed" && buildGateDecision === "accepted"),
  "Stage 03 gate must be open for review or closed with acceptance",
);
assert.equal(
  frontmatterValue(humanGate, "build_evidence_sha256"),
  await fileHash(projectRoot, fromRoot("factory/03_build/output/BUILD_EVIDENCE.md")),
);
assert.equal(
  frontmatterValue(humanGate, "verification_sha256"),
  await fileHash(projectRoot, fromRoot("factory/03_build/output/VERIFY.md")),
);

console.log("Stage 03 build verification passed.");
