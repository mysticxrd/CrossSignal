import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const textPattern = /\.(?:c|css|html|js|json|jsonc|jsx|md|mjs|sql|ts|tsx|txt|yml|yaml)$/i;

export function repositoryPath(projectRoot, path) {
  return relative(projectRoot, path).split(sep).join("/");
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function fileHash(projectRoot, path) {
  const bytes = await readFile(path);
  const name = repositoryPath(projectRoot, path);
  const normalized = textPattern.test(name) || /(?:^|\/)\.gitattributes$/i.test(name)
    ? Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"))
    : bytes;
  return sha256(normalized);
}

export async function walkFiles(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export async function pathHash(projectRoot, path) {
  if ((await stat(path)).isFile()) return fileHash(projectRoot, path);
  const lines = await Promise.all(
    (await walkFiles(path))
      .sort((left, right) =>
        repositoryPath(projectRoot, left).localeCompare(repositoryPath(projectRoot, right)),
      )
      .map(async (file) =>
        `${repositoryPath(projectRoot, file)}\0${await fileHash(projectRoot, file)}\n`,
      ),
  );
  return sha256(lines.join(""));
}

export function frontmatterValue(markdown, field) {
  return markdown.match(new RegExp(`^${field}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? null;
}

export function markdownSection(markdown, headingPattern) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return "";
  const endOffset = lines.slice(start + 1).findIndex((line) => /^##\s/.test(line));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  return lines.slice(start, end).join("\n");
}

export function markdownHashBindings(markdown) {
  const bindings = [];
  for (const match of markdown.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)) {
    bindings.push({ input: match[1], expected: match[2] });
  }
  return bindings;
}

export function runChecked(command, args, options = {}) {
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: options.timeout ?? 120_000,
  });
  if (result.status !== 0) {
    const detail = result.error?.message ?? result.stderr ?? result.stdout;
    throw new Error(`${command} ${args.join(" ")} failed:\n${detail}`);
  }
  return { stdout: result.stdout, stderr: result.stderr };
}
