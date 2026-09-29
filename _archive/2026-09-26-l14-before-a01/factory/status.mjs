import { deriveFactoryState } from "./_lib/factory-state.mjs";

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
  return lines.join("\n");
}

const json = process.argv.includes("--json");
deriveFactoryState()
  .then((state) => process.stdout.write(`${json ? JSON.stringify(state, null, 2) : formatFactoryState(state)}\n`))
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
