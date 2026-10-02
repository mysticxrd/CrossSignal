import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecked } from "./_lib/verify-kit.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const field = (text, name) => text?.match(new RegExp(`^${name}:[ \\t]*([^\\r\\n]*)$`, "m"))?.[1]?.trim() || null;

async function optionalFile(path) {
  try { return await readFile(path, "utf8"); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function reviewedTime(gate) {
  const value = field(gate, "reviewed_at");
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function humanMinutes(gate) {
  const value = field(gate, "human_minutes");
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const minutes = Number(value);
  return Number.isFinite(minutes) ? minutes : null;
}

function gateHistory(projectRoot, path, unit) {
  const git = (...args) => runChecked("git", ["-c", `safe.directory=${resolve(projectRoot)}`, ...args], { cwd: projectRoot }).stdout;
  const commits = git("log", "--reverse", "--format=%H", "--", path).split(/\r?\n/).filter(Boolean);
  const versions = [];
  for (const commit of commits) {
    if (!git("ls-tree", "--name-only", commit, "--", path).trim()) continue;
    const gate = git("show", `${commit}:${path}`);
    if (unit && field(gate, "unit") === unit) versions.push(gate);
  }
  return versions;
}

export async function readScoreboard({ projectRoot = defaultRoot } = {}) {
  const names = (await readdir(join(projectRoot, "factory"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{2}_[a-z0-9_-]+$/.test(entry.name))
    .map((entry) => entry.name).sort();
  const stages = [];
  let previousTime = null;
  for (const name of names) {
    const context = await readFile(join(projectRoot, "factory", name, "CONTEXT.md"), "utf8");
    const path = `factory/${name}/output/HUMAN_GATE.md`;
    const gate = await optionalFile(join(projectRoot, path));
    const unit = field(context, "unit");
    const currentGate = gate && field(gate, "unit") === unit ? gate : null;
    const time = reviewedTime(currentGate);
    const versions = gateHistory(projectRoot, path, unit);
    const decisions = versions.map((version) => field(version, "decision"))
      .filter((decision) => ["accepted", "changes-requested", "rejected"].includes(decision));
    stages.push({
      stage: name,
      cycleMinutes: time !== null && previousTime !== null ? (time - previousTime) / 60000 : null,
      humanMinutes: humanMinutes(currentGate),
      repairRounds: versions.length > 0 ? versions.filter((version) => field(version, "decision") === "changes-requested").length : null,
      firstPassAccepted: decisions.length > 0 ? decisions[0] === "accepted" : null,
    });
    previousTime = time;
  }
  return { stages };
}

export function formatScoreboard(scoreboard) {
  const rows = scoreboard.stages.map((stage) => ({
    STAGE: stage.stage,
    CYCLE_MIN: stage.cycleMinutes === null ? "n/a" : stage.cycleMinutes.toFixed(2),
    HUMAN_MIN: stage.humanMinutes === null ? "n/a" : String(stage.humanMinutes),
    REPAIRS: stage.repairRounds === null ? "n/a" : String(stage.repairRounds),
    FIRST_PASS: stage.firstPassAccepted === null ? "n/a" : stage.firstPassAccepted ? "yes" : "no",
  }));
  const headers = ["STAGE", "CYCLE_MIN", "HUMAN_MIN", "REPAIRS", "FIRST_PASS"];
  const widths = headers.map((header) => Math.max(header.length, ...rows.map((row) => row[header].length)));
  const line = (row) => headers.map((header, index) => row[header].padEnd(widths[index])).join("  ");
  return [line(Object.fromEntries(headers.map((header) => [header, header]))), ...rows.map(line)].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  readScoreboard().then((scoreboard) => process.stdout.write(`${process.argv.includes("--json") ? JSON.stringify(scoreboard, null, 2) : formatScoreboard(scoreboard)}\n`))
    .catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
