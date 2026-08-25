export const L20_ERRORS = Object.freeze({
  activeArchiveDependency: "l20_active_archive_dependency",
  duplicateGraphAuthority: "l20_duplicate_graph_authority",
  fixtureProjectionDrift: "l20_fixture_projection_drift",
  forbiddenProductFactoryImport: "l20_forbidden_product_factory_import",
  forbiddenTestFixtureImport: "l20_forbidden_test_fixture_import",
  graphProjectionDrift: "l20_graph_projection_drift",
  resetScopeDrift: "l20_reset_scope_drift",
  truthModeDrift: "l20_truth_mode_drift",
});

export const DURABLE_PROJECTION = Object.freeze({
  fixtureKey: "onboarding-rescue:stage03-v1",
  traceKey: "onboarding-rescue-stage03-v1",
  spendingCapUsd: 0.15,
  fixtureTruthMode: "FIXTURE",
  intentTruthMode: "TEST",
  graphVersion: "crosssignal-fixed-graph-v1",
  handlerVersion: "crosssignal-fixture-handlers-v1",
  artifactSchemaVersion: "reasoning-artifact-v2",
  nodes: Object.freeze([
    Object.freeze({ nodeKey: "planner", predecessors: Object.freeze([]) }),
    Object.freeze({ nodeKey: "quantitative", predecessors: Object.freeze(["planner"]) }),
    Object.freeze({ nodeKey: "qualitative", predecessors: Object.freeze(["planner"]) }),
    Object.freeze({ nodeKey: "experiment_design", predecessors: Object.freeze(["planner"]) }),
    Object.freeze({
      nodeKey: "skeptic",
      predecessors: Object.freeze(["quantitative", "qualitative", "experiment_design"]),
    }),
    Object.freeze({
      nodeKey: "synthesizer",
      predecessors: Object.freeze([
        "planner",
        "quantitative",
        "qualitative",
        "experiment_design",
        "skeptic",
      ]),
    }),
  ]),
});

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function isProductPath(path) {
  return /^(?:app|db|worker)\//.test(path);
}

function isDurableFlightRecorderTest(path) {
  return /^tests\/flight-recorder-(?:data|build|release)\.test\.mjs$/.test(path);
}

export function evaluateImport({ importer, target }) {
  const normalizedImporter = normalizePath(importer);
  const normalizedTarget = normalizePath(target);
  if (/(?:^|\/)\_archive\//.test(normalizedTarget)) {
    return { allowed: false, error: L20_ERRORS.activeArchiveDependency };
  }
  if (isProductPath(normalizedImporter) && /^factory\//.test(normalizedTarget)) {
    return { allowed: false, error: L20_ERRORS.forbiddenProductFactoryImport };
  }
  if (
    isDurableFlightRecorderTest(normalizedImporter)
    && /^factory\/02_data\/fixtures\//.test(normalizedTarget)
  ) {
    return { allowed: false, error: L20_ERRORS.forbiddenTestFixtureImport };
  }
  return { allowed: true, error: null };
}

export const IMPORT_CASES = Object.freeze([
  Object.freeze({
    id: "IMP-L20-01",
    criterion: "AC-L20-01",
    importer: "db/flight-recorder.ts",
    target: "db/flight-recorder-demo.ts",
    expected: Object.freeze({ allowed: true, error: null }),
  }),
  Object.freeze({
    id: "IMP-L20-02",
    criterion: "AC-L20-01",
    importer: "db/flight-recorder.ts",
    target: "factory/02_data/fixtures/runtime-copy.mjs",
    expected: Object.freeze({ allowed: false, error: L20_ERRORS.forbiddenProductFactoryImport }),
  }),
  Object.freeze({
    id: "IMP-L20-03",
    criterion: "AC-L20-01",
    importer: "tests/flight-recorder-data.test.mjs",
    target: "factory/02_data/fixtures/onboarding-rescue.fixture.mjs",
    expected: Object.freeze({ allowed: false, error: L20_ERRORS.forbiddenTestFixtureImport }),
  }),
  Object.freeze({
    id: "IMP-L20-04",
    criterion: "AC-L20-07",
    importer: "tests/flight-recorder-build.test.mjs",
    target: "_archive/prior-run/02_data/fixtures/graph.fixture.mjs",
    expected: Object.freeze({ allowed: false, error: L20_ERRORS.activeArchiveDependency }),
  }),
  Object.freeze({
    id: "IMP-L20-05",
    criterion: "AC-L20-08",
    importer: "factory/02_data/verify.mjs",
    target: "db/flight-recorder-demo.ts",
    expected: Object.freeze({ allowed: true, error: null }),
  }),
  Object.freeze({
    id: "IMP-L20-06",
    criterion: "AC-L20-01",
    importer: "tests/icm-workspace.test.mjs",
    target: "factory/01_spec/verify.mjs",
    expected: Object.freeze({ allowed: true, error: null }),
  }),
]);

function projectionError(code, detail) {
  throw new Error(`${code}: ${detail}`);
}

export function assertDurableProjection(actual) {
  for (const key of ["fixtureKey", "traceKey", "spendingCapUsd", "graphVersion", "handlerVersion", "artifactSchemaVersion"]) {
    if (actual[key] !== DURABLE_PROJECTION[key]) {
      const graphField = ["graphVersion", "handlerVersion", "artifactSchemaVersion"].includes(key);
      projectionError(
        graphField ? L20_ERRORS.graphProjectionDrift : L20_ERRORS.fixtureProjectionDrift,
        key,
      );
    }
  }
  if (
    actual.fixtureTruthMode !== DURABLE_PROJECTION.fixtureTruthMode
    || actual.intentTruthMode !== DURABLE_PROJECTION.intentTruthMode
  ) projectionError(L20_ERRORS.truthModeDrift, "truth modes");

  const actualNodes = actual.nodes ?? [];
  const nodeKeys = actualNodes.map(({ nodeKey }) => nodeKey);
  if (new Set(nodeKeys).size !== nodeKeys.length) {
    projectionError(L20_ERRORS.duplicateGraphAuthority, "duplicate node key");
  }
  if (JSON.stringify(actualNodes) !== JSON.stringify(DURABLE_PROJECTION.nodes)) {
    projectionError(L20_ERRORS.graphProjectionDrift, "topology");
  }
  return true;
}

function mutatedProjection(change) {
  return {
    ...DURABLE_PROJECTION,
    nodes: DURABLE_PROJECTION.nodes.map((node) => ({
      nodeKey: node.nodeKey,
      predecessors: [...node.predecessors],
    })),
    ...change,
  };
}

export const PROJECTION_MUTATIONS = Object.freeze([
  Object.freeze({
    id: "DRIFT-L20-01",
    criterion: "AC-L20-08",
    value: mutatedProjection({ fixtureKey: "onboarding-rescue:drifted" }),
    error: L20_ERRORS.fixtureProjectionDrift,
  }),
  Object.freeze({
    id: "DRIFT-L20-02",
    criterion: "AC-L20-03",
    value: mutatedProjection({ graphVersion: "caller-graph-v2" }),
    error: L20_ERRORS.graphProjectionDrift,
  }),
  Object.freeze({
    id: "DRIFT-L20-03",
    criterion: "AC-L20-04",
    value: mutatedProjection({ fixtureTruthMode: "LIVE" }),
    error: L20_ERRORS.truthModeDrift,
  }),
  Object.freeze({
    id: "DRIFT-L20-04",
    criterion: "AC-L20-03",
    value: mutatedProjection({
      nodes: [...DURABLE_PROJECTION.nodes, DURABLE_PROJECTION.nodes[0]],
    }),
    error: L20_ERRORS.duplicateGraphAuthority,
  }),
  Object.freeze({
    id: "DRIFT-L20-05",
    criterion: "AC-L20-03",
    value: mutatedProjection({
      nodes: DURABLE_PROJECTION.nodes.map((node) => node.nodeKey === "skeptic"
        ? { nodeKey: node.nodeKey, predecessors: ["planner"] }
        : { nodeKey: node.nodeKey, predecessors: [...node.predecessors] }),
    }),
    error: L20_ERRORS.graphProjectionDrift,
  }),
]);

export const RESET_CASES = Object.freeze([
  Object.freeze({
    id: "RESET-L20-01",
    criterion: "AC-L20-06",
    actorWorkspace: "workspace-a",
    traceWorkspace: "workspace-a",
    fixtureKey: DURABLE_PROJECTION.fixtureKey,
    truthMode: "FIXTURE",
    expectedDeletedTraces: 1,
    preserves: Object.freeze([
      "workspace",
      "workspace_membership",
      "workspace_authority_control",
      "other_workspace_traces",
      "non_fixture_traces",
      "prior_release_evidence",
    ]),
  }),
  Object.freeze({
    id: "RESET-L20-02",
    criterion: "AC-L20-06",
    actorWorkspace: "workspace-a",
    traceWorkspace: "workspace-b",
    fixtureKey: DURABLE_PROJECTION.fixtureKey,
    truthMode: "FIXTURE",
    expectedDeletedTraces: 0,
    error: L20_ERRORS.resetScopeDrift,
  }),
  Object.freeze({
    id: "RESET-L20-03",
    criterion: "AC-L20-06",
    actorWorkspace: "workspace-a",
    traceWorkspace: "workspace-a",
    fixtureKey: DURABLE_PROJECTION.fixtureKey,
    truthMode: "TEST",
    expectedDeletedTraces: 0,
  }),
]);

export function evaluateResetCase(resetCase) {
  if (resetCase.actorWorkspace !== resetCase.traceWorkspace) {
    return { deletedTraces: 0, error: L20_ERRORS.resetScopeDrift };
  }
  const exact = resetCase.fixtureKey === DURABLE_PROJECTION.fixtureKey
    && resetCase.truthMode === "FIXTURE";
  return { deletedTraces: exact ? 1 : 0, error: null };
}

export const SEAL_TRANSITION_CASE = Object.freeze({
  id: "SEAL-L20-01",
  criterion: "AC-L20-07",
  activeNumberedFixturePresent: false,
  runtimeImportsResolveFrom: Object.freeze(["db/flight-recorder-demo.ts", "db/flight-recorder-graph.ts"]),
  expectedRuntimeBehavior: "unchanged",
  expectedDurableTests: "pass",
});

export const ACCEPTANCE_COVERAGE = Object.freeze({
  "AC-L20-01": Object.freeze(["IMP-L20-01", "IMP-L20-02", "IMP-L20-03", "IMP-L20-06"]),
  "AC-L20-02": Object.freeze(["DRIFT-L20-01"]),
  "AC-L20-03": Object.freeze(["DRIFT-L20-02", "DRIFT-L20-04", "DRIFT-L20-05"]),
  "AC-L20-04": Object.freeze(["DRIFT-L20-03"]),
  "AC-L20-05": Object.freeze(["SEAL-L20-01"]),
  "AC-L20-06": Object.freeze(["RESET-L20-01", "RESET-L20-02", "RESET-L20-03"]),
  "AC-L20-07": Object.freeze(["IMP-L20-04", "SEAL-L20-01"]),
  "AC-L20-08": Object.freeze(["IMP-L20-05", "DRIFT-L20-01"]),
  "AC-L20-09": Object.freeze(["SEAL-L20-01"]),
});
