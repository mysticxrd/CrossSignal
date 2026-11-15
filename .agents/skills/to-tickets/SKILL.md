---
name: to-tickets
description: "Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker)."
---

Read and follow `.claude/skills/to-tickets/SKILL.md` in this repository.
Use the text after `$to-tickets` or `/to-tickets` as its arguments in place of
`$ARGUMENTS`. Ignore Claude-only frontmatter; invocation policy is in
`agents/openai.yaml` here. Follow `AGENTS.md` for nested skill calls and overrides.
Resolve relative references from the shared skill's folder, not this wrapper.
