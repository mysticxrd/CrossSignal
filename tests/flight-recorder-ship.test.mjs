import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("packages a complete evaluator release identity and proof index", async () => {
  const manifest = await read("factory/05_ship/output/RELEASE_MANIFEST.md");

  for (const heading of [
    "## Release identity",
    "## Truth manifest",
    "## Architecture",
    "## Threat model",
    "## Cold setup",
    "## Proof index",
    "## Residual limits",
  ]) {
    assert.match(manifest, new RegExp("^" + heading + "$", "m"));
  }

  assert.match(manifest, /trace_d12fc25947ed88cd/);
  assert.match(manifest, /truth_mode: FIXTURE/);
  assert.match(manifest, /effect_mode: TEST/);
  assert.match(manifest, /human control layer for consequential agent actions/i);
  assert.match(manifest, /single-user UI does not visually prove tenant isolation/i);
});

test("keeps every release proof link resolvable", async () => {
  const expected = [
    "factory/01_spec/output/SPEC.md",
    "factory/03_build/output/BUILD_EVIDENCE.md",
    "factory/04_verify/output/VERIFICATION_REPORT.md",
    "factory/04_verify/output/VERIFY.md",
    "factory/04_verify/output/HUMAN_GATE.md",
    "factory/04_verify/output/screenshots/01-global-pause.png",
    "factory/04_verify/output/screenshots/03-indeterminate-control.png",
    "factory/04_verify/output/screenshots/04-correlated-not-proven.png",
    "factory/04_verify/output/screenshots/05-golden-narrative-trace.png",
    "factory/04_verify/output/screenshots/06-golden-authorization.png",
    "factory/05_ship/output/DEMO_SCRIPT.md",
    "factory/05_ship/output/screenshots/01-cold-reset-ready.png",
    "factory/05_ship/output/screenshots/02-cold-indeterminate-no-retry.png",
    "factory/05_ship/output/screenshots/03-cold-correlated-outcome.png",
    "factory/05_ship/output/screenshots/04-cold-golden-trace-proof.png",
    "factory/05_ship/output/screenshots/05-cold-persisted-authorization.png",
  ];

  await Promise.all(expected.map((path) => access(new URL(path, projectRoot))));
});

test("gives a cold reviewer exact setup, reset, approval, failure, and inspection steps", async () => {
  const script = await read("factory/05_ship/output/DEMO_SCRIPT.md");

  assert.match(script, /npm install/);
  assert.match(script, /npm run demo:prepare/);
  assert.match(script, /npm run dev/);
  assert.match(script, /http:\/\/localhost:3000\//);
  assert.match(script, /Reset exact FIXTURE trace for replay/);
  assert.match(script, /Pause all actions/);
  assert.match(script, /Edit proposed action/);
  assert.match(script, /Provider times out after dispatch/);
  assert.match(script, /INDETERMINATE · NO RETRY/);
  assert.match(script, /Authorize exact action/);
  assert.match(script, /Correlated, not proven/i);
  assert.match(script, /## 90-second narrative/);
  assert.match(script, /80–90 seconds/);
});

test("publishes the current product truth instead of the pre-Build prototype story", async () => {
  const readme = await read("README.md");

  assert.match(readme, /human control layer for consequential agent actions/i);
  assert.match(readme, /FIXTURE/);
  assert.match(readme, /TEST/);
  assert.match(readme, /Correlated, not proven/);
  assert.match(readme, /npm run verify:ship/);
  assert.doesNotMatch(readme, /does not yet contain the bounded graph/);
});

test("inherits only an accepted Verify gate and preserves explicit non-claims", async () => {
  const [gate, manifest, script] = await Promise.all([
    read("factory/04_verify/output/HUMAN_GATE.md"),
    read("factory/05_ship/output/RELEASE_MANIFEST.md"),
    read("factory/05_ship/output/DEMO_SCRIPT.md"),
  ]);

  assert.match(gate, /^gate_status: closed$/m);
  assert.match(gate, /^decision: accepted$/m);
  for (const text of [manifest, script]) {
    assert.match(text, /FIXTURE/);
    assert.match(text, /TEST/);
    assert.match(text, /not proven/i);
    assert.match(text, /no (?:blind |silent )?retry/i);
    assert.doesNotMatch(
      text,
      /Result[- ]native|production[- ]proven|exactly[- ]once delivery is proven/i,
    );
  }
});
