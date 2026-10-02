import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const legacyReasons = new Map([
  ["tests/icm-workspace-legacy.test.mjs", "Retired Flight Recorder stage outputs and Result Spec fixture; snapshot assertions at tests/icm-workspace.test.mjs@62787d1:88-209."],
  ["tests/flight-recorder-ship.test.mjs", "Retired completed Flight Recorder release expects old Verify/Ship outputs and accepted Verify gate: assertions at lines 11-12, 33-53, 56-57 and 85-96."],
]);
const excludedReasons = new Map([
  ["tests/rendered-html-build.test.mjs", "Packaging assertions need dist from the network-dependent Google-font build; unchanged block from tests/rendered-html.test.mjs@62787d1:183-210."],
]);

async function discover(directory) {
  const paths = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await discover(path));
    else if (entry.isFile() && entry.name.endsWith(".test.mjs")) paths.push(path);
  }
  return paths;
}

export async function testCatalog() {
  const paths = [...await discover("tests"), ...await discover("factory")].sort();
  return paths.map((path) => {
    if (legacyReasons.has(path)) return { path, kind: "legacy", reason: legacyReasons.get(path) };
    if (excludedReasons.has(path)) return { path, kind: "excluded", reason: excludedReasons.get(path) };
    if (/^factory\/\d{2}_[^/]+\/output\//.test(path)) return { path, kind: "frozen", reason: "Preserved Build evidence/source copy; frozen proof is outside the current suite and is never rewritten." };
    return { path, kind: "current" };
  });
}

async function main(args) {
  const catalog = await testCatalog();
  if (args.includes("--list")) {
    process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
    return;
  }
  const mode = args.includes("--audit") ? "audit" : args.includes("--legacy") ? "legacy" : "current";
  const paths = catalog.filter((suite) => mode === "audit" ? suite.kind !== "excluded" : suite.kind === mode).map((suite) => suite.path);
  if (paths.length === 0) throw new Error(`No ${mode} suites found`);
  // Copy only allowed environment values; never read a real provider credential.
  const denied = new Set(["GEMINI_API_KEY", "OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]);
  const env = Object.fromEntries(Object.keys(process.env).filter((name) => !denied.has(name.toUpperCase())).map((name) => [name, process.env[name]]));
  const child = spawn(process.execPath, ["--import", "tsx", "--import", "./tests/a01-path-compat.mjs", "--test", "--test-concurrency=4", ...paths], { cwd: root, env, stdio: "inherit" });
  child.on("error", (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
