import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LIMITS, countWords, measureBudgets } from "../factory/_lib/budgets.mjs";
import { deriveFactoryState } from "../factory/_lib/factory-state.mjs";
import { frontmatterValue } from "../factory/_lib/verify-kit.mjs";
import { validateSpec } from "../factory/01_spec/verify.mjs";

const projectRoot = new URL("../", import.meta.url);
const rootPath = fileURLToPath(projectRoot);

test("provides a small router and excludes superseded history", async () => {
  const [agents, context, factory] = await Promise.all([
    readFile(new URL("AGENTS.md", projectRoot), "utf8"),
    readFile(new URL("CONTEXT.md", projectRoot), "utf8"),
    readFile(new URL("factory/CONTEXT.md", projectRoot), "utf8"),
  ]);
  assert.match(agents, /Never load `_archive\/`/);
  assert.ok(countWords(context) <= LIMITS.rootWords);
  assert.match(context, /Do not load later stages/);
  assert.match(factory, /status is derived, never an\s+editable program table/);
  for (const path of ["build_plans/", "eve-spike/", "PRD.md"]) {
    await assert.rejects(access(new URL(path, projectRoot)));
  }
});

test("keeps the current five-stage contracts bounded and gates human-owned", async () => {
  const state = await deriveFactoryState({ projectRoot: rootPath, includeGit: false });
  assert.deepEqual(state.stages.map((stage) => stage.name), ["01_spec", "02_data", "03_build", "04_verify", "05_ship"]);
  const budgets = await measureBudgets(rootPath, state.activeStage);
  assert.deepEqual(budgets.breaches, []);
  const factory = await readFile(new URL("factory/CONTEXT.md", projectRoot), "utf8");
  assert.match(factory, /The first incomplete stage is active/);
  for (const stage of state.stages) {
    const context = await readFile(new URL(`factory/${stage.name}/CONTEXT.md`, projectRoot), "utf8");
    for (const heading of ["Inputs", "Process", "Outputs", "Verify", "Human gate", "Failure routing"]) {
      assert.match(context, new RegExp(`^## ${heading}$`, "m"));
    }
    assert.match(context, /^Do not load:.*archive/m);
    assert.match(context, /output\/VERIFY\.md/);
    assert.match(context, /output\/HUMAN_GATE\.md/);
    if (stage.gate === "missing") {
      await assert.rejects(access(new URL(`factory/${stage.name}/output/`, projectRoot)));
    } else {
      const gate = await readFile(new URL(`factory/${stage.name}/output/HUMAN_GATE.md`, projectRoot), "utf8");
      const decision = frontmatterValue(gate, "decision");
      const gateStatus = frontmatterValue(gate, "gate_status");
      assert.ok(["open", "closed", "blocked"].includes(gateStatus));
      assert.ok(["pending", "accepted", "changes-requested", "rejected"].includes(decision));
      if (gateStatus === "closed") assert.notEqual(decision, "pending");
      if (decision === "accepted") {
        assert.equal(gateStatus, "closed");
        const verify = await readFile(new URL(`factory/${stage.name}/output/VERIFY.md`, projectRoot), "utf8");
        assert.equal(frontmatterValue(verify, "status"), "passed");
        assert.equal(stage.gate, "accepted", stage.reasons.join("\n"));
      }
    }
  }
  for (const path of ["factory/01_prove-result/", "factory/02_contract-trace/", "factory/03_build-slice/", "factory/04_verify-runtime/", "factory/05_package-demo/", "factory/01_spec/output/FIT_DECISION.md"]) {
    await assert.rejects(access(new URL(path, projectRoot)));
  }
  const architecture = await readFile(new URL("factory/_shared/ARCHITECTURE_SNAPSHOT.md", projectRoot), "utf8");
  assert.match(architecture, /source_sha256: 752F1B2A74BAD47102FEF7C240FA66E6FD817874483D8A7A207AAB33A90514DF/);
  assert.match(architecture, /edit_policy: edit-source-then-regenerate/);
});

test("fails the current Spec contract closed on missing evidence or invented authority", async () => {
  const valid = (await readFile(new URL("factory/01_spec/output/SPEC.md", projectRoot), "utf8")).replace(/\r\n?/g, "\n");
  assert.deepEqual(validateSpec(valid), []);
  assert.match(validateSpec(valid.replace("## Acceptance criteria", "")).join("\n"), /missing heading/);
  assert.match(validateSpec(valid.replace("model_evaluation: NOT_RUN", "model_evaluation: PASSED")).join("\n"), /cannot claim model evaluation/);
  assert.match(validateSpec(valid.replace("paid_api_authorization: not-granted", "paid_api_authorization: granted")).join("\n"), /undocumented paid API authority/);
});
