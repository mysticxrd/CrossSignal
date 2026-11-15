---
name: walkthrough
description: "Teach a CrossSignal build, recap first, then plain words, then how it works and the engineering principle it applies; check understanding with four principle questions prepared before the lesson (two rounds at most). Use on the last slice of a product task, after /pr and before merging, or when the owner types /walkthrough."
---

Read and follow `.claude/skills/walkthrough/SKILL.md` in this repository.
Use the text after `$walkthrough` or `/walkthrough` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
