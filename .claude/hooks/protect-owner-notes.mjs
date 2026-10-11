// PreToolUse hook: docs/owner/ holds the owner's own explanations, so Claude's
// file and shell tools may read it but never change it. This is a guardrail
// against accidents, not a security boundary.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const OWNER_PATH = /(?<![\w.-])docs[\\/]owner(?![\w.-])/i;
const FILE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_WRITE = new RegExp([
  String.raw`>{1,2}\s*["']?[^\s"'|;&]*docs[\\/]owner`,
  String.raw`\b(tee|mv|cp|rm|rmdir|touch|mkdir|ln|truncate|install)\b`,
  String.raw`\bsed\s+(-\w*\s+)*-i`,
  String.raw`\bperl\s+(-\w*\s+)*-\w*i`,
  String.raw`\b(Set|Add|Clear)-Content\b`,
  String.raw`\b(New|Remove|Move|Copy|Rename)-Item\b`,
  String.raw`\bOut-File\b`,
  String.raw`\bgit\s+(checkout|restore|rm|mv|apply|stash|clean|reset)\b`,
  String.raw`\b(writeFile|appendFile|rmSync|unlink|rename|WriteAll\w*|AppendAll\w*)`,
].join("|"), "i");

export const DENY_REASON =
  "docs/owner/ is the owner's own writing. Read it, ask questions or point out errors in chat; never change it.";

export function ownerNoteViolation({ tool_name: tool, tool_input: input = {}, cwd = process.cwd() }) {
  if (tool === "Bash" || tool === "PowerShell") {
    const command = String(input.command ?? "");
    return OWNER_PATH.test(command) && SHELL_WRITE.test(command);
  }
  if (!FILE_TOOLS.has(tool)) return false;
  const target = input.file_path ?? input.notebook_path;
  return typeof target === "string" && OWNER_PATH.test(resolve(cwd, target));
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    console.error("protect-owner-notes: unreadable hook input; allowing the call");
    return;
  }
  if (!ownerNoteViolation(event)) return;
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: DENY_REASON,
    },
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
