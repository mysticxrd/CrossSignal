import { deriveFactoryState } from "./_lib/factory-state.mjs";
import { measureBudgets } from "./_lib/budgets.mjs";

deriveFactoryState()
  .then(async (state) => {
    const budgets = await measureBudgets(undefined, state.activeStage);
    state.seal.reasons.push(...budgets.breaches.map((breach) => `budget breach: ${breach}`));
    state.seal.sealed = state.seal.reasons.length === 0;
    if (state.seal.sealed) {
      process.stdout.write(`sealed ${state.seal.head}\n`);
      return;
    }
    process.stderr.write(`release is not sealed:\n- ${state.seal.reasons.join("\n- ")}\n`);
    process.exitCode = 1;
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
