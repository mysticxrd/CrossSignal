import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  pathHash,
  runChecked,
} from "./verify-kit.mjs";

const defaultProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function inside(path, parent) {
  const relation = relative(parent, path);
  return relation === "" || (!relation.startsWith(`..${sep}`) && relation !== "..");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function expectedOutputs(context) {
  const outputs = markdownSection(context, /^## Outputs$/);
  return [...outputs.matchAll(/`output\/([^`]+)`/g)].map((match) => match[1]);
}

function artifactHashField(file) {
  return `${basename(file, ".md").toLowerCase()}_sha256`;
}

function resolveBinding(projectRoot, primaryOutput, input) {
  const cleaned = input.replace(/[\\/]$/, "");
  const path = cleaned.startsWith(".")
    ? resolve(dirname(primaryOutput), cleaned)
    : resolve(projectRoot, cleaned);
  if (!inside(path, projectRoot)) throw new Error(`binding escapes repository: ${input}`);
  return path;
}

async function inspectBinding(projectRoot, primaryOutput, binding, hashCache) {
  const path = resolveBinding(projectRoot, primaryOutput, binding.input);
  let actual = hashCache.get(path);
  if (!actual) {
    try {
      actual = await pathHash(projectRoot, path);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      actual = null;
    }
    hashCache.set(path, actual);
  }
  return { ...binding, path, actual, matches: actual === binding.expected };
}

function isFreshnessDependency(projectRoot, stage, priorStages, binding) {
  const sharedRoot = join(projectRoot, "factory/_shared");
  if (inside(binding.path, sharedRoot)) return true;
  if (binding.path === stage.contextPath) return true;
  return priorStages.some((prior) => inside(binding.path, prior.outputPath));
}

async function inspectStage(projectRoot, stage, priorStages, isFinal, hashCache) {
  const context = await readFile(stage.contextPath, "utf8");
  const required = expectedOutputs(context);
  if (!(await exists(stage.outputPath))) {
    return {
      name: stage.name,
      status: "never-run",
      gate: "missing",
      dependencies: "unknown",
      head: isFinal ? "unknown" : "not-applicable",
      required,
      reasons: ["output directory is absent"],
      historicalDrift: [],
    };
  }

  const missing = [];
  for (const file of required) {
    if (!(await exists(join(stage.outputPath, file)))) missing.push(file);
  }
  if (missing.length > 0) {
    return {
      name: stage.name,
      status: "in-progress",
      gate: "incomplete",
      dependencies: "unknown",
      head: isFinal ? "unknown" : "not-applicable",
      required,
      reasons: [`missing outputs: ${missing.join(", ")}`],
      historicalDrift: [],
    };
  }

  const verifyPath = join(stage.outputPath, "VERIFY.md");
  const gatePath = join(stage.outputPath, "HUMAN_GATE.md");
  const primaryNames = required.filter((file) => !["VERIFY.md", "HUMAN_GATE.md"].includes(file));
  const primaryPaths = primaryNames.map((file) => join(stage.outputPath, file));
  const [verify, gate, ...primaryDocuments] = await Promise.all([
    readFile(verifyPath, "utf8"),
    readFile(gatePath, "utf8"),
    ...primaryPaths.map((path) => readFile(path, "utf8")),
  ]);

  const gateReasons = [];
  if (frontmatterValue(verify, "status") !== "passed") gateReasons.push("VERIFY.md is not passed");
  if (frontmatterValue(gate, "gate_status") !== "closed") gateReasons.push("human gate is not closed");
  if (frontmatterValue(gate, "decision") !== "accepted") gateReasons.push("human gate is not accepted");

  const verificationExpected = frontmatterValue(gate, "verification_sha256");
  const verificationActual = await fileHash(projectRoot, verifyPath);
  if (verificationExpected !== verificationActual) gateReasons.push("human gate does not bind current VERIFY.md");

  for (const [index, primaryPath] of primaryPaths.entries()) {
    const field = artifactHashField(primaryNames[index]);
    const expected = frontmatterValue(gate, field);
    const actual = await fileHash(projectRoot, primaryPath);
    if (expected !== actual) gateReasons.push(`human gate does not bind current ${primaryNames[index]}`);
  }

  const manifestSection = markdownSection(
    primaryDocuments[0] ?? "",
    /^## Declared input (?:hashes|bindings)$/,
  );
  const bindings = await Promise.all(
    markdownHashBindings(manifestSection).map((binding) =>
      inspectBinding(projectRoot, primaryPaths[0], binding, hashCache),
    ),
  );
  const dependencyBindings = bindings.filter((binding) =>
    isFreshnessDependency(projectRoot, stage, priorStages, binding),
  );
  const dependencyDrift = dependencyBindings.filter((binding) => !binding.matches);
  const historicalDrift = bindings.filter((binding) => !binding.matches);
  const headDrift = isFinal ? historicalDrift : [];

  let status = "complete";
  const reasons = [...gateReasons];
  if (gateReasons.length > 0) status = "in-progress";
  else if (dependencyDrift.length > 0 || headDrift.length > 0) {
    status = "stale";
    reasons.push(
      ...dependencyDrift.map((binding) => `dependency drift: ${binding.input}`),
      ...headDrift
        .filter((binding) => !dependencyDrift.includes(binding))
        .map((binding) => `release-head drift: ${binding.input}`),
    );
  }

  return {
    name: stage.name,
    status,
    gate: gateReasons.length === 0 ? "accepted" : "incomplete",
    dependencies: dependencyDrift.length === 0 ? "fresh" : "stale",
    head: isFinal ? (headDrift.length === 0 ? "fresh" : "stale") : "not-applicable",
    required,
    reasons,
    historicalDrift: historicalDrift.map((binding) => binding.input),
  };
}

export async function readGitState(projectRoot = defaultProjectRoot) {
  const status = runChecked("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: projectRoot,
  });
  const head = runChecked("git", ["rev-parse", "HEAD"], { cwd: projectRoot });
  const changes = status.stdout.split(/\r?\n/).filter(Boolean);
  return { clean: changes.length === 0, changes, head: head.stdout.trim() };
}

export function evaluateSeal(factoryState, gitState) {
  const reasons = [];
  if (factoryState.stages.some((stage) => stage.status !== "complete")) {
    reasons.push("one or more factory stages are not complete");
  }
  const finalStage = factoryState.stages.at(-1);
  if (!finalStage || finalStage.head !== "fresh") reasons.push("final release does not bind the current product head");
  if (!gitState.clean) reasons.push("Git worktree or index is not clean");
  return { sealed: reasons.length === 0, reasons, head: gitState.head };
}

export async function deriveFactoryState({ projectRoot = defaultProjectRoot, includeGit = true } = {}) {
  const factoryRoot = join(projectRoot, "factory");
  const names = (await readdir(factoryRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{2}_[a-z0-9_-]+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const definitions = names.map((name) => ({
    name,
    contextPath: join(factoryRoot, name, "CONTEXT.md"),
    outputPath: join(factoryRoot, name, "output"),
  }));
  const stages = [];
  const hashCache = new Map();
  for (const [index, stage] of definitions.entries()) {
    stages.push(
      await inspectStage(projectRoot, stage, definitions.slice(0, index), index === definitions.length - 1, hashCache),
    );
  }
  const activeStage = stages.find((stage) => stage.status !== "complete")?.name ?? null;
  const state = { stages, activeStage };
  if (includeGit) {
    const git = await readGitState(projectRoot);
    state.git = git;
    state.seal = evaluateSeal(state, git);
  }
  return state;
}
