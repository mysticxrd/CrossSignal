import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownSection } from "./verify-kit.mjs";

export const LIMITS = Object.freeze({
  stageWords: 350,
  rootWords: 350,
  factoryWords: 400,
  sharedWords: 800,
  agentsLines: 60,
  coldWords: 2500,
  reviewWords: 200,
});

export function countWords(text) {
  return text.split(/[ \t\n\r\v\f]+/).filter(Boolean).length;
}

export function countLines(text) {
  return text.length === 0 ? 0 : text.split("\n").length - Number(text.endsWith("\n"));
}

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function measureBudgets(projectRoot = defaultRoot, activeStage = null) {
  const stageNames = (await readdir(join(projectRoot, "factory"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{2}_[a-z0-9_-]+$/.test(entry.name))
    .map((entry) => entry.name).sort();
  const rules = [
    ["AGENTS.md", "lines", LIMITS.agentsLines],
    ["CONTEXT.md", "words", LIMITS.rootWords],
    ["factory/CONTEXT.md", "words", LIMITS.factoryWords],
    ["factory/_templates/stage/CONTEXT.md", "words", LIMITS.stageWords],
    ...stageNames.map((name) => [`factory/${name}/CONTEXT.md`, "words", LIMITS.stageWords]),
    ...(await readdir(join(projectRoot, "factory/_shared"), { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => [`factory/_shared/${entry.name}`, "words", LIMITS.sharedWords]),
  ];
  const templates = await readdir(join(projectRoot, "factory/_templates"));
  if (templates.includes("REVIEW_BRIEF.md")) rules.push(["factory/_templates/REVIEW_BRIEF.md", "words", LIMITS.reviewWords]);
  const documents = new Map();
  const files = await Promise.all(rules.map(async ([path, unit, limit]) => {
    const text = await readFile(join(projectRoot, path), "utf8");
    documents.set(path, text);
    const words = countWords(text), lines = countLines(text);
    return { path, words, lines, unit, limit, breached: (unit === "words" ? words : lines) > limit };
  }));
  const decisionIds = new Map(stageNames.map((name) => [name,
    [...new Set(documents.get(`factory/${name}/CONTEXT.md`).match(/\bD-\d+\b/g) ?? [])].sort(),
  ]));
  const decisionWordsById = new Map();
  if ([...decisionIds.values()].some((ids) => ids.length > 0)) {
    const decisions = await readFile(join(projectRoot, "factory/DECISIONS.md"), "utf8");
    for (const entry of decisions.split(/(?=^## D-\d+\b)/m)) {
      const id = /^## (D-\d+)\b/.exec(entry)?.[1];
      if (id) decisionWordsById.set(id, countWords(entry));
    }
  }
  const coldLoads = stageNames.map((name) => {
    const contract = `factory/${name}/CONTEXT.md`;
    const inputs = markdownSection(documents.get(contract), /^## Inputs$/);
    const shared = [...inputs.matchAll(/`([^`]*_shared\/[^`]+)`/g)].map((match) => {
      const absolute = resolve(projectRoot, dirname(contract), match[1]);
      const path = relative(projectRoot, absolute).split(sep).join("/");
      if (!path.startsWith("factory/_shared/") || !documents.has(path)) throw new Error(`Unlisted shared file: ${path}`);
      return path;
    });
    const paths = [...new Set(["AGENTS.md", "CONTEXT.md", "factory/CONTEXT.md", contract, ...shared])];
    const upfrontWords = paths.reduce((sum, path) => sum + countWords(documents.get(path)), 0);
    const decisionEntries = decisionIds.get(name);
    const decisionWords = decisionEntries.reduce((sum, id) => {
      if (!decisionWordsById.has(id)) throw new Error(`Missing decision entry: ${id}`);
      return sum + decisionWordsById.get(id);
    }, 0);
    return { stage: name, paths, upfrontWords, decisionEntries, decisionWords, words: upfrontWords + decisionWords, limit: LIMITS.coldWords };
  });
  const coldLoad = activeStage
    ? coldLoads.find((load) => load.stage === activeStage)
    : coldLoads.reduce((largest, load) => !largest || load.words > largest.words ? load : largest, null);
  if (!coldLoad) throw new Error(`Unknown active stage: ${activeStage}`);
  const breaches = files.filter((file) => file.breached).map((file) => `${file.path}: ${file[file.unit]} ${file.unit} > ${file.limit}`);
  if (coldLoad.words > coldLoad.limit) breaches.push(`cold load (${coldLoad.stage}): ${coldLoad.words} words > ${coldLoad.limit}`);
  return { files, coldLoad, breaches };
}
