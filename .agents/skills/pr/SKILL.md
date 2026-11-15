---
name: pr
description: "Review and open the pull request for a built CrossSignal slice, work Codex's findings on it, or clean up after the merge. Use when a slice passes npm test and npm run lint, after Codex reviews the PR, after the owner merges it, or when the owner types /pr."
---

Read and follow `.claude/skills/pr/SKILL.md` in this repository.
Use the text after `$pr` or `/pr` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
