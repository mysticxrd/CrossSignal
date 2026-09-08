import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
} from "../_lib/verify-kit.mjs";
import {
  L14_ACCEPTANCE_IDS,
  L14_CORRUPTIONS,
  L14_NEGATIVE_IDS,
  L14_TRACE_RESOLUTION_FIXTURE,
  l14FixtureDigest,
  validateL14Fixture,
} from "../02_data/fixtures/l14-trace-resolution.fixture.mjs";
import { projectFlightTraceEvents } from "../../db/flight-recorder-contracts.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pathFromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(pathFromRoot(path), "utf8");

const acceptedInputs = {
  "factory/03_build/CONTEXT.md": "45fd8c59bf4c8b30fb5adb467a6cbd8bd565f151286dbea43994750f12f68658",
  "factory/02_data/output/DATA_PACKAGE.md": "a63729a4927b0b2688f0ce0e15f005cc62e013de97b79cdf8759aa6a078b6cb0",
  "factory/02_data/output/HUMAN_GATE.md": "631d4a43b0579408da75aa162a6b5039796c4aa8f99bdc537701f7ec21197d83",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "factory/_lib/verify-kit.mjs": "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c",
  "factory/02_data/fixtures/l14-trace-resolution.fixture.mjs": "d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d",
};

const observedBaselines = {
  "package.json": "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972",
  "app/chatgpt-auth.ts": "4265a2e7c2dcb3a6f4b7026f762bf5b6e4caec76cc13c0a45987ee9a9f2e42cc",
  "app/crosssignal-auth.ts": "4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0",
  "db/index.ts": "c6fc9494d04c9457fc4178bed614d0e4ba7c5877e9d65ced11c691b735ec851e",
  "db/workspaces.ts": "d7f5b0d47fd294f2055c8f9247d9b8f5a0a7a1eb9c86e2daf5cb9d917e1a8eb6",
  "db/flight-recorder-contracts.ts": "e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192",
  "db/flight-recorder.ts": "4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0",
  "tests/flight-recorder-build.test.mjs": "7efeb3f0ca10d7b49b5d7498d364ab6c345b1919b74b6686bc774f664e52cedd",
};

const productBindings = {
  "app/crosssignal-auth.ts": "c6ab098131230d21491af33be98430ff9a12af081166a8c30bc6ff2b3bef7d7a",
  "app/trace-resolution.ts": "256b25f5350fe4c383f949dff9c6a2cdce7265626fbba62d1ee7439382f082fd",
  "app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts": "418b13ecc92d5c5e7a075bab06e33b8195aea3205ebeacac66008cd53734d7e3",
  "db/trace-resolution.ts": "2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9",
  "tests/flight-recorder-build.test.mjs": "6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b",
};

const [dataGate, buildEvidence, verification, humanGate, auth, handler, route, resolver, tests] =
  await Promise.all([
    read("factory/02_data/output/HUMAN_GATE.md"),
    read("factory/03_build/output/BUILD_EVIDENCE.md"),
    read("factory/03_build/output/VERIFY.md"),
    read("factory/03_build/output/HUMAN_GATE.md"),
    read("app/crosssignal-auth.ts"),
    read("app/trace-resolution.ts"),
    read("app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts"),
    read("db/trace-resolution.ts"),
    read("tests/flight-recorder-build.test.mjs"),
  ]);

assert.equal(frontmatterValue(dataGate, "gate_status"), "closed");
assert.equal(frontmatterValue(dataGate, "decision"), "accepted");
assert.equal(frontmatterValue(buildEvidence, "status"), "passed");
assert.equal(frontmatterValue(verification, "status"), "passed");
assert.equal(frontmatterValue(humanGate, "gate_status"), "open");
assert.equal(frontmatterValue(humanGate, "decision"), "pending");

function bindingsFor(markdown, heading) {
  return new Map(markdownHashBindings(markdownSection(markdown, heading))
    .map(({ input, expected }) => [input, expected]));
}

const declaredAcceptedInputs = bindingsFor(buildEvidence, /^## Accepted input bindings$/);
for (const [path, expected] of Object.entries(acceptedInputs)) {
  assert.equal(declaredAcceptedInputs.get(path), expected, `${path} accepted input binding drifted`);
  assert.equal(await fileHash(projectRoot, pathFromRoot(path)), expected, `${path} is stale`);
}

const declaredBaselines = bindingsFor(buildEvidence, /^## Observed baseline bindings$/);
for (const [path, expected] of Object.entries(observedBaselines)) {
  assert.equal(declaredBaselines.get(path), expected, `${path} observed baseline binding drifted`);
}

const declaredProducts = bindingsFor(buildEvidence, /^## Product bindings$/);
for (const [path, expected] of Object.entries(productBindings)) {
  assert.equal(declaredProducts.get(path), expected, `${path} product binding drifted`);
  assert.equal(await fileHash(projectRoot, pathFromRoot(path)), expected, `${path} changed after verification`);
}

assert.deepEqual(validateL14Fixture(), []);
assert.equal(
  l14FixtureDigest(),
  "3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4",
);
for (const corruption of L14_CORRUPTIONS) {
  await assert.rejects(
    projectFlightTraceEvents({
      workspaceId: L14_TRACE_RESOLUTION_FIXTURE.identity.workspaceB,
      traceId: L14_TRACE_RESOLUTION_FIXTURE.identity.traceB,
      rows: corruption.rows,
    }),
    /l04_trace_projection_incomplete/,
    corruption.id,
  );
}

assert.match(auth, /export async function getStrictCrossSignalUser\(\): Promise<ChatGPTUser \| null> \{\s*return getChatGPTUser\(\);\s*\}/);
assert.match(handler, /const user = await dependencies\.authenticate\(\)/);
assert.match(handler, /const \{ workspaceId, traceId \} = await context\.params/);
assert.match(handler, /url\.searchParams\.size > 0/);
assert.match(handler, /private, no-store/);
for (const code of [
  "invalid_trace_request",
  "authentication_required",
  "trace_not_found",
  "trace_projection_incomplete",
  "trace_resolution_unavailable",
]) assert.ok(handler.includes(code), `missing stable error code ${code}`);
assert.ok(handler.indexOf("dependencies.authenticate") < handler.indexOf("dependencies.resolve"));

assert.match(route, /export const dynamic = "force-dynamic"/);
assert.equal((route.match(/export async function GET/g) ?? []).length, 1);
assert.doesNotMatch(route, /export async function (?:POST|PUT|PATCH|DELETE)/);
assert.doesNotMatch(route, /runtime\s*=\s*["']edge["']/);
assert.match(route, /authenticate: getStrictCrossSignalUser/);
assert.doesNotMatch(route, /^import \{ resolveFlightTrace \}/m);
assert.match(route, /resolve: async \(input\)[\s\S]+await import\([\s\S]+db\/trace-resolution/);

assert.match(resolver, /workspace_id = \? AND user_id = \? AND role = 'owner'/);
assert.equal((resolver.match(/WHERE workspace_id = \? AND (?:id|trace_id) = \?/g) ?? []).length, 2);
assert.match(resolver, /ORDER BY sequence ASC/);
assert.match(resolver, /projectFlightTraceEvents/);
for (const forbidden of ["INSERT INTO", "UPDATE ", "DELETE FROM", "getOrCreateFlightRecorderSnapshot"]) {
  assert.equal(resolver.includes(forbidden), false, `resolver contains ${forbidden}`);
  assert.equal(handler.includes(forbidden), false, `handler contains ${forbidden}`);
}

assert.match(tests, /L14 real handler resolves pending and completed tenant traces without mutation/);
assert.match(tests, /L14 handler fails closed for auth, input, tenant, integrity, and dependency attacks/);
assert.match(tests, /L14 route delegates strict authentication to the tenant-bound read-only resolver/);
assert.match(tests, /doesNotMatch\(route, \/\^import \\\{ resolveFlightTrace/);
assert.match(tests, /projectFlightTraceEvents\(\{[\s\S]+rows: corruption\.rows/);
for (const id of [...L14_ACCEPTANCE_IDS, ...L14_NEGATIVE_IDS]) {
  assert.ok(buildEvidence.includes(id), `build evidence is missing ${id}`);
}
for (const command of [
  "tsx --test tests/flight-recorder-build.test.mjs",
  "tsx factory/03_build/verify.mjs",
  "npm run lint",
  "npm run build",
  "npm run start",
  "curl.exe -sS -i",
  "git diff --check",
]) {
  assert.ok(verification.includes(command), `verification is missing ${command}`);
}

const gateBindings = new Map(markdownHashBindings(humanGate)
  .map(({ input, expected }) => [input, expected]));
for (const path of [
  "factory/03_build/output/BUILD_EVIDENCE.md",
  "factory/03_build/output/VERIFY.md",
]) {
  assert.equal(
    gateBindings.get(path),
    await fileHash(projectRoot, pathFromRoot(path)),
    `${path} human gate binding drifted`,
  );
}

console.log(
  "L14 Stage 03 build verification passed: strict auth, tenant-bound read-only resolution, " +
  "2 success traces, 5 stable errors, 5 fail-closed corruptions, 14 acceptance IDs, and 12 negative cases.",
);
