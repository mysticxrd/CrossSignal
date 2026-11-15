---
name: drill
description: "Set up a small exercise where the owner rebuilds a core primitive by hand, with a spec and failing tests but no solution. Use only when the owner types /drill."
---

Read and follow `.claude/skills/drill/SKILL.md` in this repository.
Use the text after `$drill` or `/drill` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
