import { observableFixture, initialWorld, advanceWorld, referenceTransition, SCOPE, SEED } from "./world.mjs";
const action = (service, fromVersion, toVersion) => ({ kind: "simulated_rollback", service, fromVersion, toVersion, environment: "SIMULATED", maxRuns: 1, maxCostMinor: 0, externalWrite: false });
const branches = {};
for (const [name, transition] of [["checkout", action("checkout", "v142", "v141")], ["notifications", action("notifications", "v8", "v7")], ["none", null]]) {
  let state = initialWorld();
  if (transition) state = referenceTransition(state, transition);
  const events = [];
  for (let i = 0; i < 2; i++) { const result = advanceWorld(state); state = result.next; events.push(...result.events); }
  branches[name] = { state, events };
}
process.stdout.write(`${JSON.stringify({ version: "a01-data-reference-v1", seed: SEED, scope: SCOPE,
  complete: observableFixture(), limited: observableFixture({ limited: true }), injection: observableFixture({ injection: true }), branches }, null, 2)}\n`);
