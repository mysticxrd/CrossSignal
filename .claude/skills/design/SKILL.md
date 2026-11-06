---
name: design
description: Brainstorm and design a meaningful CrossSignal change with the owner before writing code. Use when the owner asks for new behaviour or a change to a prompt, tool, state, retries, idempotency or authority, or types /design.
argument-hint: <feature or slice>
---

# Design before code

Feature: $ARGUMENTS

The owner must be able to explain this design at whiteboard level without you.
Your job is to correct and deepen their mental model, not to replace it. Make no
edits until they reply "build". Plan mode suits this skill.

## 1. Read the code first

Read the files on the path from trigger to stored result, and cite `file:line`.
If a recent `docs/owner/` note covers this area, read it too: it shows how the
owner pictures it now.

## 2. Brainstorm

Ask the questions whose answers would change the design, one at a time,
usually three to five. Start each with what the code does now. When an answer
conflicts with the code or an earlier answer, say so with `file:line` and push
back once. Stop when the open questions would no longer change the design. The
conversation is the spec; the owner may talk as long as they like.

## 3. Give the design, short, in this order

1. Control flow: numbered steps from trigger to stored result, with paths.
   For any loop, name the line that ends it and what that line checks. "It
   accepts whatever the model returns" is an answer the owner should see.
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
6. The slices, in order. Each is one PR, reviewable in one sitting, under about
   300 changed lines of product code (frozen data excluded), with the test that
   proves it. Split anything bigger.
7. The owner's decision: the one real design choice (a stopping rule, retry
   rule, failure state, eval case or grader), with two or three alternatives,
   their trade-offs, the one you will build unless overruled, and the tests
   that will check it. The owner picks or overrules; you write the code.
8. The proof bars, set before any run. For each bar, name one other cause
   that would move the same number, and the measure that tells the two apart.
   A model run is judged on what it read as well as what it answered: rows
   read against rows available, data left unread at the end, rows cited. A
   right answer on thin evidence is not a pass.

End with: "Reply build when this makes sense." Then wait.

## 4. After "build"

With more than one slice, or work that won't finish in this session, write
`work/tasks/<slug>/plan.md`: the design, then each slice with its inputs,
outputs and test. Then build the first slice.

Before the first B01 or A01 batch, write two or three sentences in
`work/tasks/<slug>/notes.md`: "If this misses the bar, the likeliest reason
is …". Copy them into the PR unchanged, beside the result, whether or not
they came true.
