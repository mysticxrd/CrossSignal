import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const specUrl = new URL("./output/SPEC.md", import.meta.url);
const requiredSources = [
  "https://www.result.dev/",
  "https://www.result.dev/thesis",
  "https://www.ycombinator.com/companies/result",
  "https://lab.result.dev/",
];
const requiredHeadings = [
  "## Relationship to Result",
  "## Public evidence",
  "## Product definition",
  "## Primary user and problem",
  "## Golden path",
  "## Scope",
  "## Acceptance criteria",
  "## Current repository truth",
  "## Evaluator thesis",
  "## Explicit non-claims",
];
const forbiddenClaims = [
  /\bResult-native\b/i,
  /\bResult (?:Postgres|Function|Email|Analytics|AI|SDK\/CLI)\b/,
  /docs\.result\.dev/i,
  /owner-authorized Result test workspace/i,
];
const secretPatterns = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}/,
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}/,
  /\bgh[oprsu]_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function validateSpec(text) {
  const errors = [];
  if (typeof text !== "string" || text.trim().length === 0) {
    return ["specification must be non-empty Markdown"];
  }

  for (const heading of requiredHeadings) {
    if (!text.includes(heading)) errors.push(`missing heading: ${heading}`);
  }
  for (const source of requiredSources) {
    if (!text.includes(source)) errors.push(`missing public source: ${source}`);
  }
  for (const label of ["Public fact", "Inference", "Unknown / non-claim"]) {
    if (!text.includes(label)) errors.push(`missing evidence label: ${label}`);
  }
  for (const required of [
    /target company and evaluation audience/i,
    /standalone/i,
    /Company Brain/i,
    /FIXTURE/i,
    /02_data/i,
    /AC-01/,
    /AC-08/,
  ]) {
    if (!required.test(text)) errors.push(`missing required specification statement: ${required}`);
  }
  for (const forbidden of forbiddenClaims) {
    if (forbidden.test(text)) errors.push(`contains unsupported Result claim: ${forbidden}`);
  }
  for (const secret of secretPatterns) {
    if (secret.test(text)) errors.push(`contains forbidden secret pattern: ${secret}`);
  }

  return errors;
}

async function main() {
  const spec = await readFile(specUrl, "utf8");
  const errors = validateSpec(spec);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  process.stdout.write(
    `${JSON.stringify({
      status: "passed",
      artifact: "factory/01_spec/output/SPEC.md",
      publicSources: requiredSources.length,
      acceptanceCriteria: 8,
      unsupportedPrivateClaims: 0,
    }, null, 2)}\n`,
  );
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedUrl === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
