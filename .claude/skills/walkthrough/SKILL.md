---
name: walkthrough
description: Teach a CrossSignal build, recap first, then plain words, then how it works and the engineering principle it applies; check understanding with four principle questions prepared before the lesson (two rounds at most). Use after /pr on a product change, before merging, or when the owner types /walkthrough.
argument-hint: "[base ref]"
---

# Teach the build, then check understanding

Base: $ARGUMENTS (default: `origin/main`).

The goal is for the owner to reason about the system they are building and to
carry its engineering principles to the next one, in as little of their time
as possible. The owner keeps principles, not file paths, so the questions test
the principle a build applies, never its code path. Write the questions first,
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
4. Name the one or two engineering principles the build applies, each as a
   rule that would hold in another project (for example "beat the cheapest
   rival before claiming a win", "grade how it decided, apart from the
   result"). Find an earlier CrossSignal build that applied or broke the same
   principle, if there is one.
5. For the recap, read `CONTEXT.md` and the merged PRs on `origin/main`
   (`gh pr list --state merged --base main --limit 15`; without `--base main`
   the list includes PRs merged into another branch, which are not on main)
   to see what CrossSignal has built so far and where this build sits.

## 2. Write the questionnaire before the lesson

Write `work/tasks/<slug>/walkthrough.md` (gitignored) with four questions, one
per ability, all tested on this build's own example or a changed one:

| # | Ability | Shape |
|---|---|---|
| 1 | Problem and new behavior | In plain words: what went wrong before this build, what happens now, and who is better off? |
| 2 | Name the principle | What general rule does this build apply, and what would go wrong without it? |
| 3 | Apply it | A case the lesson did not show, in this build or another system: what does the principle predict, and why? Where, if anywhere, must a person approve? |
| 4 | Trade-off | Why this approach over its alternative, and what result would tell you the choice was wrong? |

For each question, write:
- **Question:** answerable in one to three sentences of everyday words. Never
  put the answer in the question, and never test vocabulary, file names,
  function names or exact numbers.
- **Key:** the expected answer in one to three points. Keep `file:line`
  links in the key for your grading, not in what the owner must say.
- **Pass bar:** the principle or reasoning the answer must contain to pass.
- **Backup:** a second question that tests the same idea in a changed scenario.

Drop a slot only when the build has nothing for it, and say why.

## 3. Teach exactly what the questions need

Teach in one message, in four short parts, each with at most one labelled
visual and about five sentences. Use the same example throughout. Define a
term in everyday words before using it.

1. **Recap: what is built so far.** One small map or table of CrossSignal as
   it stands, at most six rows, each labelled built, simulated or planned,
   with this build's place marked. No code.
2. **This build in plain words.** The problem, the before/after experience
   and why anyone should care, told with no code, file names or jargon; an
   everyday analogy if it helps. A small input → system → result map.
3. **How it works.** Trace the example from trigger to stored result: data
   crossing each boundary with small example values, state changes and write
   order, side effects (model calls, network requests, database or file
   writes), with clickable `file:line` links. Changed files in request order,
   tests last, one sentence each. Show before/after UI screenshots here.
4. **The principle.** State it as a reusable rule, show where this build
   applies it and where an earlier build did, and what goes wrong without
   it. Then the owner's decision, its alternative, what breaks if it was
   wrong, the failure, repeat-request and approval paths that apply (mark
   absent ones as absent), and what the tests do not establish.

Use a flow diagram for movement, a sequence for calls, a state diagram for
changes, and small before/after examples for data. Render visuals with the
available tools; fall back to Mermaid or plain text. Mark illustrative values.

Cut anything no question depends on, except the recap. If a question needs
something the lesson lacks, add it to the lesson, not as a hint in the
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

The walkthrough is complete after round 1 if every question passed, otherwise
after round 2. Report passed and open questions; never hide a gap.

The owner's explain-back goes in `docs/owner/` in their own words. Never write
it for them, and don't paste a ready-made summary they could copy.
