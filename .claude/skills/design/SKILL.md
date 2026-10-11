---
name: design
description: Design a meaningful CrossSignal change before writing code, starting from the owner's own prediction. Use when the owner asks for new behaviour or a change to a prompt, tool, state, retries, idempotency or authority, or types /design.
argument-hint: <feature or slice>
---

# Design before code

Feature: $ARGUMENTS

The owner must be able to explain this design at whiteboard level without you.
Your job is to correct and deepen their mental model, not to replace it. Make no
edits until they reply "build". Plan mode suits this skill.

## 1. Get the prediction first

Look for a prediction in the request or in the newest `docs/owner/*.md` note.
If there is none, ask for one in a single short message and stop:

- Problem: what hurts, for whom?
- My mental model: how do you think it works?
- Components: which parts are involved?
- Data flow: what moves where, in what order?
- Unknowns: what are you unsure about?

Rough answers are fine. Never show your own design before you have theirs.

## 2. Read only what the change touches

Read the files on the path from trigger to stored result. Cite `file:line`.

## 3. Give the design, short, in this order

1. Control flow: numbered steps from trigger to stored result, with paths.
2. State: what is stored, where (Postgres table, file, memory), who writes it,
   and what dies with the process.
3. Model or code: which step needs the model and why; everything else is
   deterministic code. The model is never the security boundary.
4. Failure cases, each with what is stored and what the person sees:
   - the model call succeeds but the database write fails;
   - the same job runs twice;
   - a tool times out or returns something malformed;
   - 100, then 1,000, concurrent investigations: what breaks first.
5. One rejected alternative and the trade-off that rejected it. Never answer
   "why" with "best practice".
6. The slice: the smallest one reviewable in one sitting, under about 300
   changed lines of product code (frozen data excluded), and the test that
   proves it. Split anything bigger.
7. Where the prediction was wrong or incomplete, quoting the owner's words.
8. The `TODO(human)`: the one real design decision the owner will write (a
   stopping rule, retry rule, failure state, eval case or grader), with its
   trade-offs and the tests that will check it.

End with: "Reply build when this makes sense." Then wait.
