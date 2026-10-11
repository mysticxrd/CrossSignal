---
name: grill
description: Interview the owner about a CrossSignal area one question at a time, check each answer against the code, and list the gaps. Use only when the owner types /grill.
argument-hint: "[area or slice]"
disable-model-invocation: true
---

# Grill me

Topic: $ARGUMENTS (default: the changes on the current branch).

## Rules

- One question at a time. Wait for the answer. Never give the answer first.
- After each answer, check it against the code and say right, partly right or
  wrong, with `file:line` evidence and the missing piece in two or three lines.
- Ask about this code, not generic theory. Push once on vague answers.
- Ask 8 to 12 questions, drawn from both lists below, hardest last.

## Questions about the system

- Why is there a queue here, or why not?
- Why Postgres instead of memory for this state?
- Why is this a separate layer?
- Why is this an agent step and not deterministic code?
- What happens if this tool times out?
- What happens if this job executes twice?
- Which data is durable, and what dies with the process?
- How would you debug a failed investigation?
- What breaks first under load?
- Where is the security boundary?

## Interview questions

- Why this design? What alternatives did you reject?
- Where is state stored? How does an investigation resume after a crash?
- How are tool inputs and outputs validated? What happens when a tool fails?
- How do you prevent duplicate actions?
- How do you evaluate the agent, and how do you know a change improved it?
- What changes at 10 times the load?
- Why an agent at all?

## End

List each gap with the file to read and one `/drill` that would close it.
Suggest running `/grill` on the same topic again in a week. Don't write to
`docs/owner/`; the owner records what they learned.
