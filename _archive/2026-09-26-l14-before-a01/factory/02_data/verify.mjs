import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  pathHash,
} from "../_lib/verify-kit.mjs";
import {
  SUPABASE_TRACE_RESOLUTION_FIXTURE,
  validateSupabaseTraceResolutionFixture,
} from "./fixtures/supabase-trace-resolution.fixture.mjs";

const root = resolve(import.meta.dirname, "../..");
const dataPackagePath = resolve(import.meta.dirname, "output/DATA_PACKAGE.md");
const migrationPath = resolve(import.meta.dirname, "postgres/0001_trace_resolution_read_model.sql");
const sqlTestsPath = resolve(import.meta.dirname, "postgres/0001_trace_resolution_read_model.tests.sql");
const sourceFixturePath = resolve(import.meta.dirname, "fixtures/l14-trace-resolution.fixture.mjs");
const postgresFixturePath = resolve(import.meta.dirname, "fixtures/supabase-trace-resolution.fixture.mjs");
const upstreamGatePath = resolve(import.meta.dirname, "../01_spec/output/HUMAN_GATE.md");

const [dataPackage, migration, sqlTests, upstreamGate] = await Promise.all([
  readFile(dataPackagePath, "utf8"),
  readFile(migrationPath, "utf8"),
  readFile(sqlTestsPath, "utf8"),
  readFile(upstreamGatePath, "utf8"),
]);

assert.equal(frontmatterValue(dataPackage, "stage"), "02_data");
assert.equal(frontmatterValue(dataPackage, "unit"), "supabase-postgres-authenticated-trace-resolution-parity");
assert.equal(frontmatterValue(dataPackage, "truth_mode"), "TEST");
assert.equal(frontmatterValue(upstreamGate, "gate_status"), "closed");
assert.equal(frontmatterValue(upstreamGate, "decision"), "accepted");
assert.equal(frontmatterValue(upstreamGate, "reviewer"), "human");
assert.match(frontmatterValue(upstreamGate, "reviewed_at"), /^2026-09-08T/);

const declaredSection = markdownSection(dataPackage, /^## Declared input bindings$/);
const inputBindings = markdownHashBindings(declaredSection);
assert.equal(inputBindings.length, 14, "expected every Stage 02 input binding");
for (const binding of inputBindings) {
  const actual = await pathHash(root, resolve(root, binding.input));
  assert.equal(actual, binding.expected, `${binding.input} drifted`);
}

const artifactSection = markdownSection(dataPackage, /^## Executable artifacts$/);
const artifactBindings = [...artifactSection.matchAll(/^\| `([^`]+)` \| [^|]+ \| `([0-9a-f]{64})` \|$/gm)]
  .map((match) => ({ input: match[1], expected: match[2] }));
assert.equal(artifactBindings.length, 4, "expected four executable artifact bindings");
for (const binding of artifactBindings) {
  const actual = await fileHash(root, resolve(root, binding.input));
  assert.equal(actual, binding.expected, `${binding.input} artifact drifted`);
}

assert.deepEqual(validateSupabaseTraceResolutionFixture(), []);
assert.deepEqual(SUPABASE_TRACE_RESOLUTION_FIXTURE.counts, {
  workspaces: 2,
  workspace_members: 2,
  flight_traces: 2,
  flight_trace_events: 77,
});
assert.equal(SUPABASE_TRACE_RESOLUTION_FIXTURE.sourceDigest, "3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4");
assert.equal(SUPABASE_TRACE_RESOLUTION_FIXTURE.packageDigest, "8d87c72cb8c8d84575f16b66672fe8094930b631dbba58cf7e9b2df0a8ed396e");

const createTables = [...migration.matchAll(/create table cfr_app\.([a-z_]+)/gi)].map((match) => match[1]);
assert.deepEqual(createTables, ["workspaces", "workspace_members", "flight_traces", "flight_trace_events"]);
assert.match(migration, /^begin;/i);
assert.match(migration, /commit;\s*$/i);
assert.match(migration, /create schema cfr_app;/i);
assert.match(migration, /create role cfr_trace_reader[\s\S]+nologin[\s\S]+nobypassrls/i);
assert.doesNotMatch(migration, /security definer/i);
assert.equal((migration.match(/security invoker/gi) ?? []).length, 4);
assert.equal((migration.match(/enable row level security/gi) ?? []).length, 4);
assert.equal((migration.match(/force row level security/gi) ?? []).length, 4);
assert.equal((migration.match(/create policy /gi) ?? []).length, 4);
assert.match(migration, /for select to cfr_trace_reader/gi);
assert.equal((migration.match(/for select to cfr_trace_reader/gi) ?? []).length, 4);
assert.doesNotMatch(migration, /grant\s+(?:all|insert|update|delete)/i);
assert.match(migration, /grant select on cfr_app\.workspaces, cfr_app\.workspace_members,[\s\S]+flight_traces, cfr_app\.flight_trace_events to cfr_trace_reader;/i);
assert.match(migration, /revoke all on schema cfr_app from public, anon, authenticated, service_role;/i);
assert.match(migration, /revoke all on all tables in schema cfr_app from public, anon, authenticated, service_role;/i);
assert.match(migration, /payload_json jsonb not null/i);
assert.match(migration, /retention_until timestamptz not null/i);
assert.match(migration, /occurred_at timestamptz not null/i);
assert.match(migration, /sequence bigint not null/i);
assert.match(migration, /pg_advisory_xact_lock/i);
assert.match(migration, /hashtextextended/i);
assert.match(migration, /current_setting\('app\.current_user_id', true\)/i);
assert.match(migration, /current_setting\('app\.current_workspace_id', true\)/i);
for (const required of [
  "fk_flight_traces_workspace_creator_membership",
  "fk_workspaces_owner_membership",
  "fk_flight_trace_events_workspace_trace",
  "chk_flight_trace_events_payload_hash",
  "trg_flight_traces_identity_immutable",
  "trg_flight_trace_events_update_guard",
  "trg_flight_trace_events_delete_guard",
  "trg_flight_trace_events_insert_guard",
  "trace event sequence is not globally gap-free",
  "trace event subject is outside its trace",
  "trace event violates its subject state machine",
]) assert.match(migration, new RegExp(required));

assert.equal((sqlTests.match(/^begin;$/gim) ?? []).length, 3);
assert.equal((sqlTests.match(/^rollback;$/gim) ?? []).length, 3);
for (const required of [
  "owner A event visibility drifted",
  "owner B event visibility drifted",
  "transaction-local tenant context leaked",
  "reader mutation unexpectedly succeeded",
  "sequence gap unexpectedly succeeded",
  "foreign trace subject unexpectedly succeeded",
  "invalid transition unexpectedly succeeded",
  "foreign human actor unexpectedly succeeded",
  "event update unexpectedly succeeded",
  "non-fixture event delete unexpectedly succeeded",
]) assert.match(sqlTests, new RegExp(required));

for (const phrase of [
  /Scope correction requiring human ownership/,
  /Full referential enforcement therefore\s+cannot coexist with a four-table schema/,
  /AC-SP-04` remains only partially satisfiable/,
  /D1 cannot be removed while this limitation remains/,
  /no local PostgreSQL client\/server is\s+available/,
  /no remote target is authorized/,
]) assert.match(dataPackage, phrase);

const sensitiveFiles = await Promise.all([
  readFile(dataPackagePath, "utf8"),
  readFile(migrationPath, "utf8"),
  readFile(sqlTestsPath, "utf8"),
  readFile(postgresFixturePath, "utf8"),
]);
const combined = sensitiveFiles.join("\n");
for (const forbidden of [
  /postgres(?:ql)?:\/\//i,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /sb_secret_[A-Za-z0-9_-]+/,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
]) assert.doesNotMatch(combined, forbidden);

assert.equal(await fileHash(root, sourceFixturePath), "d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d");

console.log(
  "Supabase Stage 02 data verification passed: four private PostgreSQL tables, " +
  "77 deterministic fixture events, forced tenant RLS, least-privilege reader, " +
  "transactional SQL tests, and explicit non-trace subject-binding limitation.",
);
