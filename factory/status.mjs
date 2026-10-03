import { deriveFactoryState } from "./_lib/factory-state.mjs";
import { measureBudgets } from "./_lib/budgets.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checksHash } from "./_lib/verify-kit.mjs";

function note(stage) {
  if (stage.reasons.length > 0) return stage.reasons[0];
  if (stage.historicalDrift.length > 0 && stage.head === "not-applicable") {
    return `${stage.historicalDrift.length} historical binding(s) superseded downstream`;
  }
  return "-";
}

export function formatFactoryState(state) {
  const rows = state.stages.map((stage) => ({
    STAGE: stage.name,
    STATUS: stage.status,
    GATE: stage.gate,
    DEPS: stage.dependencies,
    CHECKS: stage.checks,
    HEAD: stage.head,
    NOTE: note(stage),
  }));
  const lines = [];
  const headers = Object.keys(rows[0] ?? {});
  const widths = Object.fromEntries(
    headers.map((header) => [
      header,
      Math.max(header.length, ...rows.map((row) => String(row[header]).length)),
    ]),
  );
  lines.push(headers.map((header) => header.padEnd(widths[header])).join("  "));
  lines.push(headers.map((header) => "-".repeat(widths[header])).join("  "));
  for (const row of rows) {
    lines.push(headers.map((header) => String(row[header]).padEnd(widths[header])).join("  "));
  }
  lines.push("");
  lines.push(state.activeStage ? `Active stage: ${state.activeStage}` : "Active stage: none (pipeline complete)");
  if (state.seal) {
    lines.push(
      state.seal.sealed
        ? `Release seal: sealed at ${state.seal.head}`
        : `Release seal: unsealed (${state.seal.reasons.join("; ")})`,
    );
  }
  if (state.budgets) {
    const load = state.budgets.coldLoad;
    lines.push(`Cold load: ${load.words}/${load.limit} words (${load.stage}; upfront ${load.upfrontWords}, referenced D-entries ${load.decisionWords})`);
    lines.push(...state.budgets.breaches.map((breach) => `Budget breach: ${breach}`));
  }
  return lines.join("\n");
}

export function strictFailure(state) {
  return (state.budgets?.breaches.length ?? 0) > 0 || state.stages.some((stage) => stage.checks === "changed");
}

async function main(args) {
  const hashIndex = args.indexOf("--checks-hash");
  if (hashIndex >= 0) {
    const stage = args[hashIndex + 1];
    if (!/^\d{2}_[a-z0-9_-]+$/.test(stage ?? "")) throw new Error("--checks-hash requires NN_stage");
    const hash = await checksHash(fileURLToPath(new URL(`./${stage}/`, import.meta.url)));
    process.stdout.write(`${hash}\n`);
    return;
  }
  const state = await deriveFactoryState();
  state.budgets = await measureBudgets(undefined, state.activeStage);
  process.stdout.write(`${args.includes("--json") ? JSON.stringify(state, null, 2) : formatFactoryState(state)}\n`);
  if (args.includes("--strict") && strictFailure(state)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
