---
name: design
description: "Brainstorm and design a meaningful CrossSignal change with the owner before writing code. Use when the owner asks for new behaviour or a change to a prompt, tool, state, retries, idempotency or authority, or types /design."
---

Read and follow `.claude/skills/design/SKILL.md` in this repository.
Use the text after `$design` or `/design` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
