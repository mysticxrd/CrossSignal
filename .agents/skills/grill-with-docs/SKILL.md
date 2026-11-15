---
name: grill-with-docs
description: "A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go."
---

Read and follow `.claude/skills/grill-with-docs/SKILL.md` in this repository.
Use the text after `$grill-with-docs` or `/grill-with-docs` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
