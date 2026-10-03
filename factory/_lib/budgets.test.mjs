import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LIMITS, countLines, countWords, measureBudgets } from "./budgets.mjs";
import { runChecked } from "./verify-kit.mjs";

const root = new URL("../../", import.meta.url);

test("counts ASCII whitespace like wc and calibrates the B01 snapshot", () => {
  assert.equal(countWords(" a\tb\nc\rd\ve\ff \u00a0g "), 7);
  assert.equal(countWords(" \t\n"), 0);
  assert.equal(countLines("a\r\nb\r\n"), 2);
  const paths = ["AGENTS.md", "CONTEXT.md", "factory/CONTEXT.md", "factory/03_build/CONTEXT.md", "factory/_shared/BENCHMARK_DIRECTION.md", "factory/_shared/QUALITY_GATES.md"];
  const words = paths.reduce((sum, path) => sum + countWords(runChecked("git", ["show", `62787d1:${path}`], { cwd: root }).stdout), 0);
  assert.equal(words, 2555);
});

test("measures only the active contract's declared shared inputs", async () => {
  const budgets = await measureBudgets(fileURLToPath(root), "03_build");
  assert.deepEqual(budgets.breaches, []);
  assert.equal(budgets.coldLoad.limit, LIMITS.coldWords);
  assert.deepEqual(budgets.coldLoad.paths.filter((path) => path.startsWith("factory/_shared/")), ["factory/_shared/BENCHMARK_DIRECTION.md", "factory/_shared/QUALITY_GATES.md"]);
  // AGENTS.md is the ship-lane entry point and changes with it; pin that it is measured, not its size.
  assert.ok(budgets.coldLoad.paths.includes("AGENTS.md"));
  assert.deepEqual(budgets.coldLoad.decisionEntries, ["D-01", "D-02", "D-03"]);
  assert.equal(budgets.coldLoad.words, budgets.coldLoad.upfrontWords + budgets.coldLoad.decisionWords);
});

test("counts each referenced decision once and enforces the unchanged cold-load limit", async () => {
  const temp = await mkdtemp(join(tmpdir(), "factory-budget-"));
  try {
    await mkdir(join(temp, "factory/_shared"), { recursive: true });
    await mkdir(join(temp, "factory/_templates/stage"), { recursive: true });
    await mkdir(join(temp, "factory/03_build"), { recursive: true });
    const decisions = `## D-01\nallowed words\n\n## D-02\n${"unreferenced ".repeat(3000)}\n`;
    const files = {
      "AGENTS.md": "agent",
      "CONTEXT.md": "router",
      "factory/CONTEXT.md": "factory",
      "factory/_templates/stage/CONTEXT.md": "template",
      "factory/03_build/CONTEXT.md": "## Inputs\nSee D-01 and D-01.\n",
      "factory/DECISIONS.md": decisions,
    };
    for (const [path, text] of Object.entries(files)) await writeFile(join(temp, path), text);
    const budgets = await measureBudgets(temp, "03_build");
    assert.deepEqual(budgets.breaches, []);
    assert.deepEqual(budgets.coldLoad.decisionEntries, ["D-01"]);
    assert.equal(budgets.coldLoad.decisionWords, 4);
    assert.equal(budgets.coldLoad.upfrontWords, 9);
    assert.equal(budgets.coldLoad.words, 13);
    for (const [path, text] of Object.entries(files)) assert.equal(await readFile(join(temp, path), "utf8"), text);
    await writeFile(join(temp, "factory/DECISIONS.md"), `## D-01\n${"word ".repeat(LIMITS.coldWords)}\n`);
    const overBudget = await measureBudgets(temp, "03_build");
    assert.equal(overBudget.coldLoad.limit, 2500);
    assert.equal(overBudget.breaches.length, 1);
    assert.match(overBudget.breaches[0], /cold load \(03_build\)/);
    await writeFile(join(temp, "factory/DECISIONS.md"), "## D-02\nunreferenced\n");
    await assert.rejects(measureBudgets(temp, "03_build"), /Missing decision entry: D-01/);
  } finally {
    assert.equal(dirname(resolve(temp)), resolve(tmpdir()));
    assert.ok(temp.startsWith(join(tmpdir(), "factory-budget-")));
    await rm(temp, { recursive: true });
  }
});

test("reports individual and cold-load breaches without changing files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "factory-budget-"));
  try {
    await mkdir(join(temp, "factory/_shared"), { recursive: true });
    await mkdir(join(temp, "factory/_templates/stage"), { recursive: true });
    await mkdir(join(temp, "factory/03_build"), { recursive: true });
    const fill = (count) => Array(count).fill("word").join(" ");
    const contract = "## Inputs\n- `../_shared/ONE.md`\n- `../_shared/TWO.md`\n";
    const files = {
      "AGENTS.md": "line\n".repeat(LIMITS.agentsLines + 1),
      "CONTEXT.md": fill(LIMITS.rootWords + 1),
      "factory/CONTEXT.md": fill(LIMITS.factoryWords + 1),
      "factory/_templates/stage/CONTEXT.md": fill(LIMITS.stageWords + 1),
      "factory/03_build/CONTEXT.md": contract + fill(LIMITS.stageWords),
      "factory/_shared/ONE.md": fill(LIMITS.sharedWords + 1),
      "factory/_shared/TWO.md": fill(LIMITS.sharedWords),
    };
    for (const [path, text] of Object.entries(files)) await writeFile(join(temp, path), text);
    const budgets = await measureBudgets(temp, "03_build");
    assert.equal(budgets.breaches.length, 7);
    assert.ok(budgets.coldLoad.words > LIMITS.coldWords);
    assert.match(budgets.breaches.join("\n"), /AGENTS.md: 61 lines > 60/);
    for (const [path, text] of Object.entries(files)) assert.equal(await readFile(join(temp, path), "utf8"), text);
  } finally {
    assert.equal(dirname(resolve(temp)), resolve(tmpdir()));
    assert.ok(temp.startsWith(join(tmpdir(), "factory-budget-")));
    await rm(temp, { recursive: true });
  }
});
