import { deriveFactoryState } from "./_lib/factory-state.mjs";

deriveFactoryState()
  .then((state) => {
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
