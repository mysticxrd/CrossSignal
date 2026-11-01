---
name: grill
description: Interview the owner about a CrossSignal area one question at a time, check each answer against the code, and list the gaps. Use only when the owner types $grill or /grill.
---

# Grill me (Codex entry point)

The interview script lives in one place: `.claude/skills/grill/SKILL.md`.
Read it now and follow it exactly. Do not paste a copy here, so the two
agents never drift apart.

Codex differences:

- The topic is whatever the owner typed after `$grill` or `/grill`. If there
  is none, use the changes on the current branch (`git diff origin/main...`).
- Ignore the Claude-only frontmatter (`argument-hint`,
  `disable-model-invocation`) and the `$ARGUMENTS` placeholder.
- `/drill` in that file means `.claude/skills/drill/SKILL.md`, as in
  `AGENTS.md`.
