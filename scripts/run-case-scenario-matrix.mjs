import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function run(script, args = [], input) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, NODE_ENV: "test" }, input,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

const first = run("scripts/case-scenario-matrix.mjs");
const second = run("scripts/case-scenario-matrix.mjs");
if (first !== second) throw new Error("Case scenario matrix changed between fresh processes");
const graded = run("tests/evaluator/grade-case-scenario-matrix.mjs", ["-"], first);
const artifactHash = createHash("sha256").update(first).digest("hex");
const report = graded.replace("# Local Case scenario matrix — PASS\n",
  `# Local Case scenario matrix — PASS\n\nRepeatability: two fresh product processes produced identical JSON (SHA-256 \`${artifactHash}\`).\n`);
const reports = new URL("../reports/", import.meta.url);
mkdirSync(fileURLToPath(reports), { recursive: true });
writeFileSync(fileURLToPath(new URL("case-scenario-matrix.artifact.json", reports)), first);
writeFileSync(fileURLToPath(new URL("case-scenario-matrix.md", reports)), report);
process.stdout.write(`${report}\nArtifact: reports/case-scenario-matrix.artifact.json\nReport: reports/case-scenario-matrix.md\n`);
