import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const artifactPath = fileURLToPath(new URL("../reports/golden-case-replay.artifact.json", import.meta.url));
const reportPath = fileURLToPath(new URL("../reports/golden-case-replay.md", import.meta.url));

function run(script, args = [], input) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NODE_ENV: "test" }, input,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

const first = run("scripts/golden-case-replay.mjs");
const second = run("scripts/golden-case-replay.mjs");
if (first !== second) throw new Error("Golden-Case replay changed between fresh processes");
const replayHash = createHash("sha256").update(first).digest("hex");
const graded = run("tests/evaluator/grade-golden-case.mjs", ["-"], first);
mkdirSync(fileURLToPath(new URL("../reports/", import.meta.url)), { recursive: true });
writeFileSync(artifactPath, first);
const report = graded.replace("# Local golden-Case replay — PASS\n",
  `# Local golden-Case replay — PASS\n\nRepeatability: two fresh product processes produced identical JSON (SHA-256 \`${replayHash}\`).\n`);
writeFileSync(reportPath, report);
process.stdout.write(`${report}\nArtifact: reports/golden-case-replay.artifact.json\nReport: reports/golden-case-replay.md\n`);
