import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
} from "../_lib/verify-kit.mjs";
import {
  L14_ACCEPTANCE_IDS,
  L14_NEGATIVE_IDS,
} from "../02_data/fixtures/l14-trace-resolution.fixture.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const fromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(fromRoot(path), "utf8");

const expectedInputs = new Map([
  ["factory/04_verify/CONTEXT.md", "dde59637a7da7ce046dbe867b6ebbe7c399d42c7e1ee56f173ac061daf369eb6"],
  ["factory/03_build/output/BUILD_EVIDENCE.md", "19da3d7be1858a6d1b56f62be420a683e2a9e54fb85feef8697902c013f13c1b"],
  ["factory/03_build/output/HUMAN_GATE.md", "0de4131a5aa6fe2f35d706077f7d3407b42d7f0ced98aede56584a4e03f078fa"],
  ["factory/_shared/ARCHITECTURE_SNAPSHOT.md", "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084"],
  ["factory/_shared/QUALITY_GATES.md", "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f"],
  ["factory/_lib/verify-kit.mjs", "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c"],
  ["package.json", "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972"],
  ["app/crosssignal-auth.ts", "c6ab098131230d21491af33be98430ff9a12af081166a8c30bc6ff2b3bef7d7a"],
  ["app/trace-resolution.ts", "256b25f5350fe4c383f949dff9c6a2cdce7265626fbba62d1ee7439382f082fd"],
  ["app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts", "418b13ecc92d5c5e7a075bab06e33b8195aea3205ebeacac66008cd53734d7e3"],
  ["db/trace-resolution.ts", "2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9"],
  ["tests/flight-recorder-build.test.mjs", "6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b"],
  ["factory/02_data/fixtures/l14-trace-resolution.fixture.mjs", "d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d"],
]);

for (const [path, expected] of expectedInputs) {
  assert.equal(await fileHash(projectRoot, fromRoot(path)), expected, `${path} drifted`);
}

const [buildEvidence, buildGate, report, verification, route, handler, resolver] =
  await Promise.all([
    read("factory/03_build/output/BUILD_EVIDENCE.md"),
    read("factory/03_build/output/HUMAN_GATE.md"),
    read("factory/04_verify/output/VERIFICATION_REPORT.md"),
    read("factory/04_verify/output/VERIFY.md"),
    read("app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts"),
    read("app/trace-resolution.ts"),
    read("db/trace-resolution.ts"),
  ]);

assert.equal(frontmatterValue(buildEvidence, "status"), "passed");
assert.equal(frontmatterValue(buildGate, "gate_status"), "closed");
assert.equal(frontmatterValue(buildGate, "decision"), "accepted");
assert.equal(frontmatterValue(report, "status"), "passed");
assert.equal(frontmatterValue(report, "truth_mode"), "FIXTURE");
assert.equal(frontmatterValue(verification, "status"), "passed");

assert.doesNotMatch(route, /^import \{ resolveFlightTrace \}/m);
assert.match(route, /resolve: async \(input\)[\s\S]+await import\([\s\S]+db\/trace-resolution/);
assert.ok(handler.indexOf("dependencies.authenticate()") < handler.indexOf("dependencies.resolve("));
assert.match(resolver, /workspace_id = \? AND user_id = \? AND role = 'owner'/);
assert.equal((resolver.match(/WHERE workspace_id = \? AND (?:id|trace_id) = \?/g) ?? []).length, 2);
assert.match(resolver, /ORDER BY sequence ASC/);
assert.match(resolver, /projectFlightTraceEvents/);

for (const id of [...L14_ACCEPTANCE_IDS, ...L14_NEGATIVE_IDS]) {
  assert.ok(report.includes(`\`${id}\``), `${id} has no recorded outcome`);
}
for (const [path, expected] of expectedInputs) {
  const binding = markdownHashBindings(report).find((item) => item.input === path);
  assert.equal(binding?.expected, expected, `${path} is not bound in the report`);
}

assert.match(report, /57\/57 focused tests passed/);
assert.match(report, /28-event pending/);
assert.match(report, /49-event completed/);
assert.match(report, /all five corruption histories/);
assert.match(report, /HTTP\/1\.1 401 Unauthorized/);
assert.match(report, /\{"error":\{"code":"authentication_required"\}\}/);
assert.match(report, /HTTP\/1\.1 400 Bad Request/);
assert.match(report, /\{"error":\{"code":"invalid_trace_request"\}\}/);
assert.match(report, /HTTP\/1\.1 500 Internal Server Error/);
assert.match(report, /\{"error":\{"code":"trace_resolution_unavailable"\}\}/);
assert.match(report, /route-loader failure was not observed/);
assert.match(report, /not a deployed or live-integration claim/);

const verifierBinding = markdownHashBindings(verification)
  .find((item) => item.input === "factory/04_verify/verify.mjs");
assert.equal(
  verifierBinding?.expected,
  await fileHash(projectRoot, fromRoot("factory/04_verify/verify.mjs")),
  "verification does not bind its verifier",
);
const reportBinding = markdownHashBindings(verification)
  .find((item) => item.input === "factory/04_verify/output/VERIFICATION_REPORT.md");
assert.equal(
  reportBinding?.expected,
  await fileHash(projectRoot, fromRoot("factory/04_verify/output/VERIFICATION_REPORT.md")),
  "verification does not bind the report",
);

const humanGate = await read("factory/04_verify/output/HUMAN_GATE.md");
assert.equal(frontmatterValue(humanGate, "gate_status"), "open");
assert.equal(frontmatterValue(humanGate, "decision"), "pending");
assert.equal(frontmatterValue(humanGate, "verification_report_sha256"), reportBinding.expected);
assert.equal(
  frontmatterValue(humanGate, "verification_sha256"),
  await fileHash(projectRoot, fromRoot("factory/04_verify/output/VERIFY.md")),
);

console.log(
  "L14 Stage 04 verification passed: production HTTP authentication and masking, 2 fixture success traces, 5 fail-closed corruptions, 14 acceptance IDs, and 12 negative cases.",
);
