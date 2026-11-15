---
name: writing-for-agents
description: "Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md."
---

Read and follow `.claude/skills/writing-for-agents/SKILL.md` in this repository.
Use the text after `$writing-for-agents` or `/writing-for-agents` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
