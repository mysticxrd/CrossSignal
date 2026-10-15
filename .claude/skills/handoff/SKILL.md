---
name: handoff
description: Write a restart prompt so a fresh session can continue the current CrossSignal task. Use when the context window is past about half, when a session ends mid-task, or when the owner types /handoff.
argument-hint: "[task slug]"
---

# Hand off to a fresh session

Task: $ARGUMENTS (default: the current branch's task).

1. Check the state: the worktree path and branch, `git status --short`,
   `git log --oneline origin/main..HEAD`, and `gh pr view --json url,state`
   if a PR exists.
2. Write a restart prompt of at most 300 words, in this shape:

   ```text
   Continue <task> in <worktree path> on <branch>.
   Goal: <one sentence>.
   Decided: <each decision so far, with the alternative it beat>.
   Done: <commits and the PR link>.
   Next: <the next concrete step>.
   Open: <questions for the owner, or "none">.
   Read first: <three to six file:line references>.
   Later: <deferred work>.
   ```

3. If `work/tasks/<slug>/` exists, add the prompt to the top of its
   `handoff.md` under today's date.
4. Print the prompt in one code block and tell the owner to run `/clear`
   (Codex: open a new chat in the same folder) and paste it.

Never put keys, tokens or `.env` values in the prompt.
