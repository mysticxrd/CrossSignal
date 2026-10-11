import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DENY_REASON, ownerNoteViolation } from "../.claude/hooks/protect-owner-notes.mjs";

const projectRoot = new URL("../", import.meta.url);
const rootPath = fileURLToPath(projectRoot);
const hookPath = fileURLToPath(new URL(".claude/hooks/protect-owner-notes.mjs", projectRoot));

function call(tool_name, tool_input, cwd = rootPath) {
  return ownerNoteViolation({ tool_name, tool_input, cwd });
}

test("blocks Claude's file tools from changing owner notes", () => {
  assert.equal(call("Write", { file_path: "docs/owner/2026-10-11-retry.md", content: "x" }), true);
  assert.equal(call("Edit", { file_path: `${rootPath}docs\\owner\\README.md`, old_string: "a", new_string: "b" }), true);
  assert.equal(call("Edit", { file_path: "README.md" }, `${rootPath}docs/owner`), true);
  assert.equal(call("NotebookEdit", { notebook_path: "docs/Owner/scratch.ipynb" }), true);
  assert.equal(call("Write", { file_path: "docs/owners-guide.md" }), false);
  assert.equal(call("Edit", { file_path: "docs/phase1-golden-revenue-leak.md" }), false);
});

test("blocks shell writes to owner notes but allows reads", () => {
  for (const command of [
    "echo hi > docs/owner/a.md",
    "printf x >> 'docs/owner/a.md'",
    "sed -i 's/a/b/' docs/owner/a.md",
    "rm -rf docs/owner",
    "git checkout -- docs/owner/a.md",
    "Set-Content -Path docs\\owner\\a.md -Value x",
    "node -e \"require('fs').writeFileSync('docs/owner/a.md','x')\"",
  ]) assert.equal(call("Bash", { command }), true, command);
  for (const command of [
    "cat docs/owner/a.md",
    "grep -rn TODO docs/owner",
    "git diff -- docs/owner",
    "git add docs/owner/a.md",
    "Get-Content docs\\owner\\a.md",
    "echo hi > docs/other.md",
  ]) assert.equal(call("PowerShell", { command }), false, command);
});

test("answers the PreToolUse protocol over stdin", () => {
  const run = (event) => spawnSync(process.execPath, [hookPath], { input: JSON.stringify(event), encoding: "utf8" });
  const denied = run({ tool_name: "Write", tool_input: { file_path: "docs/owner/x.md" }, cwd: rootPath });
  assert.equal(denied.status, 0);
  assert.deepEqual(JSON.parse(denied.stdout).hookSpecificOutput, {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: DENY_REASON,
  });
  const allowed = run({ tool_name: "Read", tool_input: { file_path: "docs/owner/x.md" }, cwd: rootPath });
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, "");
});

test("wires the guard and Learning style into project settings", async () => {
  const settings = JSON.parse(await readFile(new URL(".claude/settings.json", projectRoot), "utf8"));
  assert.equal(settings.outputStyle, "Learning");
  const [entry] = settings.hooks.PreToolUse;
  for (const tool of ["Write", "Edit", "NotebookEdit", "Bash", "PowerShell"]) {
    assert.ok(entry.matcher.split("|").includes(tool), tool);
  }
  assert.match(entry.hooks[0].command, /protect-owner-notes\.mjs/);
});
