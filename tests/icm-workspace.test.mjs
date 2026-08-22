import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { validateSpec } from "../factory/01_spec/verify.mjs";

const projectRoot = new URL("../", import.meta.url);
const stageNames = [
  "01_spec",
  "02_data",
  "03_build",
  "04_verify",
  "05_ship",
];

function words(text) {
  return text.match(/[A-Za-z0-9_-]+/g)?.length ?? 0;
}

test("provides a small root catalog and excludes superseded history", async () => {
  const [agents, context, factory, archive] = await Promise.all([
    readFile(new URL("AGENTS.md", projectRoot), "utf8"),
    readFile(new URL("CONTEXT.md", projectRoot), "utf8"),
    readFile(new URL("factory/CONTEXT.md", projectRoot), "utf8"),
    readFile(
      new URL("_archive/2026-08-12-crosssignal-phase-00/README.md", projectRoot),
      "utf8",
    ),
  ]);

  assert.ok(agents.split(/\r?\n/).length <= 60, "AGENTS.md must remain under 60 lines");
  assert.ok(words(context) <= 500, "root CONTEXT.md must remain a small router");
  assert.match(agents, /Never load `_archive\/`/);
  assert.match(context, /Do not load later stages/);
  assert.match(factory, /There is no editable\s+program status table/);
  assert.match(archive, /status: superseded/);
  assert.match(archive, /historical evidence, not active product or build\s+authority/);

  await assert.rejects(access(new URL("build_plans/", projectRoot)));
  await assert.rejects(access(new URL("eve-spike/", projectRoot)));
  await assert.rejects(access(new URL("PRD.md", projectRoot)));
});

test("implements one hardened five-stage pipeline with filesystem-derived status", async () => {
  const [agents, rootContext, factory, architecture, quality, ...stages] =
    await Promise.all([
      readFile(new URL("AGENTS.md", projectRoot), "utf8"),
      readFile(new URL("CONTEXT.md", projectRoot), "utf8"),
      readFile(new URL("factory/CONTEXT.md", projectRoot), "utf8"),
      readFile(
        new URL("factory/_shared/ARCHITECTURE_SNAPSHOT.md", projectRoot),
        "utf8",
      ),
      readFile(new URL("factory/_shared/QUALITY_GATES.md", projectRoot), "utf8"),
      ...stageNames.map((name) =>
        readFile(new URL(`factory/${name}/CONTEXT.md`, projectRoot), "utf8"),
      ),
    ]);

  assert.match(
    architecture,
    /source_sha256: 752F1B2A74BAD47102FEF7C240FA66E6FD817874483D8A7A207AAB33A90514DF/,
  );
  assert.match(architecture, /edit_policy: edit-source-then-regenerate/);
  assert.match(factory, /The active stage is the first stage that is not complete/);

  for (const [index, stage] of stages.entries()) {
    assert.ok(words(stage) <= 500, `${stageNames[index]} contract is too large`);
    for (const heading of [
      "## Inputs",
      "## Process",
      "## Outputs",
      "## Verify",
      "## Human gate",
      "## Failure routing",
    ]) {
      assert.match(stage, new RegExp(`^${heading}$`, "m"));
    }
    assert.match(stage, /Do not load: `_archive\/`/);
    assert.match(stage, /output\/VERIFY\.md/);
    assert.match(stage, /output\/HUMAN_GATE\.md/);
    if (index <= 4) {
      await access(new URL(`factory/${stageNames[index]}/output/`, projectRoot));
    } else {
      await assert.rejects(
        access(new URL(`factory/${stageNames[index]}/output/`, projectRoot)),
        `${stageNames[index]} should remain never-run`,
      );
    }
  }

  const [stageOneVerify, stageOneGate] = await Promise.all([
    readFile(new URL("factory/01_spec/output/VERIFY.md", projectRoot), "utf8"),
    readFile(
      new URL("factory/01_spec/output/HUMAN_GATE.md", projectRoot),
      "utf8",
    ),
  ]);
  assert.match(stageOneVerify, /^status: passed$/m);
  assert.match(stageOneGate, /^gate_status: closed$/m);
  assert.match(stageOneGate, /^decision: accepted$/m);

  const [stageTwoPackage, stageTwoVerify, stageTwoGate] = await Promise.all([
    readFile(new URL("factory/02_data/output/DATA_PACKAGE.md", projectRoot), "utf8"),
    readFile(new URL("factory/02_data/output/VERIFY.md", projectRoot), "utf8"),
    readFile(new URL("factory/02_data/output/HUMAN_GATE.md", projectRoot), "utf8"),
  ]);
  assert.match(stageTwoPackage, /^status: ready-for-review$/m);
  assert.match(stageTwoVerify, /^status: passed$/m);
  assert.match(stageTwoGate, /^gate_status: closed$/m);
  assert.match(stageTwoGate, /^decision: accepted$/m);

  const [stageThreeEvidence, stageThreeVerify, stageThreeGate] = await Promise.all([
    readFile(new URL("factory/03_build/output/BUILD_EVIDENCE.md", projectRoot), "utf8"),
    readFile(new URL("factory/03_build/output/VERIFY.md", projectRoot), "utf8"),
    readFile(new URL("factory/03_build/output/HUMAN_GATE.md", projectRoot), "utf8"),
  ]);
  assert.match(stageThreeEvidence, /^status: ready-for-review$/m);
  assert.match(stageThreeVerify, /^status: passed$/m);
  assert.match(stageThreeGate, /^gate_status: closed$/m);
  assert.match(stageThreeGate, /^decision: accepted$/m);

  const [stageFourReport, stageFourVerify, stageFourGate] = await Promise.all([
    readFile(new URL("factory/04_verify/output/VERIFICATION_REPORT.md", projectRoot), "utf8"),
    readFile(new URL("factory/04_verify/output/VERIFY.md", projectRoot), "utf8"),
    readFile(new URL("factory/04_verify/output/HUMAN_GATE.md", projectRoot), "utf8"),
  ]);
  assert.match(stageFourReport, /^status: ready-for-review$/m);
  assert.match(stageFourVerify, /^status: passed$/m);
  assert.match(stageFourGate, /^gate_status: closed$/m);
  assert.match(stageFourGate, /^decision: accepted$/m);

  const [stageFiveManifest, stageFiveScript, stageFiveVerify, stageFiveGate] =
    await Promise.all([
      readFile(new URL("factory/05_ship/output/RELEASE_MANIFEST.md", projectRoot), "utf8"),
      readFile(new URL("factory/05_ship/output/DEMO_SCRIPT.md", projectRoot), "utf8"),
      readFile(new URL("factory/05_ship/output/VERIFY.md", projectRoot), "utf8"),
      readFile(new URL("factory/05_ship/output/HUMAN_GATE.md", projectRoot), "utf8"),
    ]);
  assert.match(stageFiveManifest, /^status: ready-for-review$/m);
  assert.match(stageFiveScript, /^status: ready-for-review$/m);
  assert.match(stageFiveVerify, /^status: passed$/m);
  assert.match(stageFiveGate, /^gate_status: closed$/m);
  assert.match(stageFiveGate, /^decision: accepted$/m);

  for (const stalePath of [
    "factory/01_prove-result/",
    "factory/02_contract-trace/",
    "factory/03_build-slice/",
    "factory/04_verify-runtime/",
    "factory/05_package-demo/",
    "factory/01_spec/output/FIT_DECISION.md",
  ]) {
    await assert.rejects(access(new URL(stalePath, projectRoot)));
  }

  const coldWalkWords =
    words(agents) +
    words(rootContext) +
    words(factory) +
    words(architecture) +
    words(quality) +
    Math.max(...stages.map(words));
  assert.ok(
    coldWalkWords <= 6_000,
    `cold stage load is too large: ${coldWalkWords} words`,
  );
});

test("fails the Spec gate closed on missing evidence or invented internals", () => {
  const valid = `
## Relationship to Result
Result is the target company and evaluation audience. CrossSignal is standalone.
## Public evidence
- Public fact: https://www.result.dev/
- Public fact: https://www.result.dev/thesis
- Public fact: https://www.ycombinator.com/companies/result
- Public fact: https://lab.result.dev/
- Inference: Company Brain makes provenance an adjacent wedge.
- Unknown / non-claim: private implementation details.
## Product definition
Company Brain plus visible authority and provenance.
## Primary user and problem
A solo founder needs accountable delegation.
## Golden path
Start from FIXTURE evidence and end in a qualified outcome.
## Scope
One bounded onboarding-rescue slice.
## Acceptance criteria
- AC-01 reconstructs the trace.
- AC-08 exposes truth modes to a cold reviewer.
## Current repository truth
Current external evidence is FIXTURE data.
## Evaluator thesis
Show bounded production judgment.
## Explicit non-claims
02_data cannot assume private infrastructure.
`;

  assert.deepEqual(validateSpec(valid), []);
  assert.match(validateSpec(valid.replace("## Acceptance criteria", "")).join("\n"), /missing heading/);
  assert.match(
    validateSpec(`${valid}\nResult-native runtime`).join("\n"),
    /unsupported Result claim/,
  );
});
