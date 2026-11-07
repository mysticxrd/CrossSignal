---
name: walkthrough
description: Teach a CrossSignal build with simple words and visuals, check understanding with four questions prepared before the lesson (two rounds at most), then hand over the manual test. Use after /pr on a product change, before merging, or when the owner types /walkthrough.
argument-hint: "[base ref]"
---

# Teach the build, then check understanding

Base: $ARGUMENTS (default: `origin/main`).

The goal is for the owner to explain and reason about the system they are
building, in as little of their time as possible. Write the questions first,
teach exactly what they need, check once, retry once, then stop. Use the
fewest simple words that preserve the meaning; let visuals carry the lesson.

## 1. Prepare from the actual build

1. Run `git fetch origin`, `git diff --stat <base>...HEAD`, and
   `git diff <base>...HEAD`. Inspect staged, unstaged, and relevant untracked
   changes from `git status --short`; distinguish them from the PR.
2. Read the changed code, its callers, and nearest tests. Pick one concrete
   example and follow it through the system. Separate observed behavior, test
   evidence, and anything not yet verified; do not invent missing behavior.
3. Find the owner's decision and the alternatives considered. Link the code
   that implements it. If the reason is not recorded, label your inference.

## 2. Write the questionnaire before the lesson

Write `work/tasks/<slug>/walkthrough.md` (gitignored) with four questions, one
per ability, all about this build's own example:

| # | Ability | Shape |
|---|---|---|
| 1 | Problem and new behavior | Before this build, what happened to the example; what happens now, and why does it matter? |
| 2 | Trace | Follow the example from trigger to stored result: what happens at each step, and what is written where? |
| 3 | Predict | A changed input, a failure or a repeat request the lesson did not show: what happens, and why? Where, if anywhere, does a person approve? |
| 4 | Trade-off and where to look | Why the chosen approach over its alternative? If an outcome changed tomorrow, which file or test would you open first? |

For each question, write:
- **Question:** answerable in one to three sentences of everyday words. Never
  put the answer in the question, and never test vocabulary.
- **Key:** the expected answer in one to three points, each with `file:line`.
- **Pass bar:** the one idea the answer must contain to pass.
- **Backup:** a second question that tests the same idea in a changed scenario.

Drop a slot only when the build has nothing for it (for example, no failure
path), and say why. Write the manual test now too: what to open or run, the
input, and the expected success and failure behavior.

## 3. Teach exactly what the questions need

Teach in one message, three short stages, each with one labelled visual and
at most about five sentences. Use the same example throughout. Define a term
in everyday words before using it.

1. **What and why.** The problem, the before/after experience, and a small
   input → system → result map.
2. **How.** Trace the example from trigger to stored result: data crossing
   each boundary with small example values, state changes and write order,
   side effects (model calls, network requests, database or file writes),
   with clickable `file:line` links. Changed files in request order, tests
   last, one sentence each on role and why it changed.
3. **Why this way.** The failure, repeat-request and approval paths that
   apply (mark absent ones as absent), the owner's decision, its alternative,
   what breaks if it was wrong, and what the tests do not establish.

Use a flow diagram for movement, a sequence for calls, a state diagram for
changes, and small before/after examples for data. Render visuals with the
available tools; fall back to Mermaid or plain text. Show before/after UI
screenshots beside the relevant stage. Mark illustrative values.

Cut anything no question and no manual-test step depends on. If a question
needs something the lesson lacks, add it to the lesson, not as a hint in the
question.

End the same message with the four questions, numbered, and ask the owner to
answer all four in one reply, a sentence or two each; "not sure" is a valid
answer.

## 4. Check understanding: two rounds at most

**Round 1.** Grade every answer against its key and pass bar. For each, give
pass or gap, one line on what is right and one on the gap. Accept correct
everyday language. "Yes, I understand", or repeating the lesson's words
without applying them to the question's scenario, does not pass.

**Round 2**, only for missed questions. For each, reteach the gap in at most
three lines with a different visual or example, then ask its backup
question. Send all of them in one message for one reply.

**Stop after round 2.** That is the line that ends this loop; there is no
third round unless the owner asks for one with "more". In `walkthrough.md`,
record each question as passed or open, with the gap in one line. Copy open
gaps to `work/tasks/<slug>/notes.md` under "Gaps for /grill" and name them in
your report, so the owner can pass one to `/grill` or `/drill`.

Answer the owner's side questions in a few lines, then return to the
questionnaire. A side question that opens a new topic goes to `notes.md` as a
follow-up rather than into the walkthrough. If the owner stops early, say
which questions remain unverified; do not claim understanding.

## 5. End with the owner's manual test

After round 1 if everything passed, otherwise after round 2, give the
prepared manual test. Ask the owner to run it and report what happened; wait
for their result. Agent-run checks do not replace it. If it fails,
distinguish a build defect from a learning gap before going on.

The walkthrough is complete when the manual test passes. State any open gaps
beside that; never hide them.

The owner's explain-back goes in `docs/owner/` in their own words. Never write
it for them, and don't paste a ready-made summary they could copy.
