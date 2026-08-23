import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deriveFactoryState, evaluateSeal } from "./factory-state.mjs";
import { fileHash, pathHash } from "./verify-kit.mjs";

async function writeAcceptedStage(projectRoot, name, extraBindings) {
  const stageRoot = join(projectRoot, "factory", name);
  const outputRoot = join(stageRoot, "output");
  const contextPath = join(stageRoot, "CONTEXT.md");
  const primaryPath = join(outputRoot, "PRIMARY.md");
  const verifyPath = join(outputRoot, "VERIFY.md");
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    contextPath,
    "## Outputs\n\n- `output/PRIMARY.md`\n- `output/VERIFY.md`\n- `output/HUMAN_GATE.md`\n",
  );
  const bindings = [
    [
      `factory/${name}/CONTEXT.md`,
      await fileHash(projectRoot, contextPath),
    ],
    ...extraBindings,
  ];
  await writeFile(
    primaryPath,
    `## Declared input hashes\n\n| Input | SHA-256 |\n|---|---|\n${bindings
      .map(([path, hash]) => `| \`${path}\` | \`${hash}\` |`)
      .join("\n")}\n`,
  );
  await writeFile(verifyPath, "---\nstatus: passed\n---\n");
  await writeFile(
    join(outputRoot, "HUMAN_GATE.md"),
    `---\ngate_status: closed\ndecision: accepted\nprimary_sha256: ${await fileHash(
      projectRoot,
      primaryPath,
    )}\nverification_sha256: ${await fileHash(projectRoot, verifyPath)}\n---\n`,
  );
}

test("normalizes text hashes while preserving directory path identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "factory-hash-"));
  try {
    await mkdir(join(root, "one"));
    await mkdir(join(root, "two"));
    await writeFile(join(root, "one/value.md"), "alpha\r\nbeta\r\n");
    await writeFile(join(root, "two/value.md"), "alpha\nbeta\n");
    assert.equal(
      await pathHash(root, join(root, "one/value.md")),
      await pathHash(root, join(root, "two/value.md")),
    );
    assert.notEqual(await pathHash(root, join(root, "one")), await pathHash(root, join(root, "two")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not reactivate upstream stages for downstream-owned historical drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "factory-state-"));
  try {
    const productPath = join(root, "product", "owned.txt");
    await mkdir(join(root, "product"), { recursive: true });
    await writeFile(productPath, "stage-one\n");
    await writeAcceptedStage(root, "01_spec", [
      ["product/owned.txt", await fileHash(root, productPath)],
    ]);

    await writeFile(productPath, "stage-two\n");
    await writeAcceptedStage(root, "02_build", [
      [
        "factory/01_spec/output/PRIMARY.md",
        await fileHash(root, join(root, "factory/01_spec/output/PRIMARY.md")),
      ],
      [
        "factory/01_spec/output/HUMAN_GATE.md",
        await fileHash(root, join(root, "factory/01_spec/output/HUMAN_GATE.md")),
      ],
      ["product/owned.txt", await fileHash(root, productPath)],
    ]);

    const state = await deriveFactoryState({ projectRoot: root, includeGit: false });
    assert.deepEqual(state.stages.map((stage) => stage.status), ["complete", "complete"]);
    assert.deepEqual(state.stages[0].historicalDrift, ["product/owned.txt"]);
    assert.equal(state.activeStage, null);
    assert.equal(state.stages[1].head, "fresh");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sealing requires both complete evidence and a clean commit", () => {
  const state = { stages: [{ status: "complete", head: "fresh" }] };
  assert.equal(evaluateSeal(state, { clean: true, head: "abc" }).sealed, true);
  const dirty = evaluateSeal(state, { clean: false, head: "abc" });
  assert.equal(dirty.sealed, false);
  assert.match(dirty.reasons.join("\n"), /not clean/);
});
