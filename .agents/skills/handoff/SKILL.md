---
name: handoff
description: "Write a restart prompt so a fresh session can continue the current CrossSignal task. Use when the context window is past about half, when a session ends mid-task, or when the owner types /handoff."
---

Read and follow `.claude/skills/handoff/SKILL.md` in this repository.
Use the text after `$handoff` or `/handoff` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
