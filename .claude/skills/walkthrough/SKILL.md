---
name: walkthrough
description: Teach a CrossSignal build from beginner to advanced with simple words and visual explanations, then interview the owner until they demonstrate understanding, ending with their manual test. Use after /pr on a product change, before merging, or when the owner types /walkthrough.
argument-hint: "[base ref]"
---

# Teach the build, then check understanding

Base: $ARGUMENTS (default: `origin/main`).

The goal is for the owner to explain and reason about the system they are
building. Teach first; interview second. Use the fewest simple words that
preserve the meaning, with visual explanations carrying most of the lesson.

## Prepare from the actual build

1. Run `git fetch origin`, `git diff --stat <base>...HEAD`, and
   `git diff <base>...HEAD`. Inspect staged, unstaged, and relevant untracked
   changes from `git status --short`; distinguish them from the PR.
2. Read the changed code, its callers, and nearest tests. Follow one concrete
   request through the system. Separate observed behavior, test evidence,
   and anything not yet verified; do not invent missing behavior.
3. Find the owner's decision and the alternatives considered. Link the code
   that implements it. If the reason is not recorded, label your inference.

## Teach: beginner to advanced

Use the same concrete example throughout. Teach in short stages, adding one
layer at a time. Start with the user's experience, then reveal the code.
Define a technical term in everyday words before using it. Use an analogy
only when it helps, then connect it to the real mechanism.

1. **Beginner — what and why.** Show the problem and the before/after
   experience. Draw a small input → system → result map. Explain what this
   build changes and where it fits in CrossSignal.
2. **Intermediate — how it works.** Visually trace the example from trigger
   to stored result and what the person sees. Show the data crossing each
   boundary with small example values, state changes and write order, and
   side effects such as model calls, network requests, database or file writes.
   Attach clickable `file:line` references at the relevant steps. Cover
   changed files in request order, tests last, with one sentence on each
   file's role and why it changed.
3. **Advanced — why it behaves this way.** Show the relevant failure paths,
   retries, duplicate-request behavior (idempotency), and human approval
   boundaries. Explain the owner's chosen approach, its tradeoff, the
   alternative, and what would break if the decision were wrong. Connect
   these claims to tests and identify what those tests do not establish.
   Cover only mechanisms relevant to this build; mark absent ones as absent.

Make every major concept visual: use a flow diagram for movement, a sequence
for calls, a state diagram for changes, and small before/after examples for
data. Prefer several small, clearly labelled visuals to one dense diagram.
Use available rendering tools to show visuals in the conversation; use
Mermaid or plain-text diagrams when rendering is unavailable. Use interaction
when changing an input makes the behavior easier to understand. Show available
before/after UI screenshots alongside the relevant explanation, not only at
the end. Keep labels consistent, mark illustrative values, and avoid decorative
images or paragraphs that merely repeat a diagram.

## Interview: demonstrate understanding

After teaching the stages, ask **one question at a time and wait for the
owner's answer**. Do not supply the answer inside the question. Start simple
and increase difficulty based on their answers; this is a conversation, not
a fixed quiz or a vocabulary test.

Track whether the owner can, in their own words:

- Explain the problem and the new behavior.
- Trace the example through the components, data, state, and side effects.
- Predict a relevant failure or repeat-request outcome and explain why,
  including where human approval is needed when applicable.
- Explain the chosen tradeoff and locate the code or test they would inspect
  to investigate a changed outcome.

Check each answer against the code. Briefly name what is right and the
specific gap, if any. Reteach that gap with a simpler or different visual,
then ask a fresh question that tests the same idea in a changed scenario.
Return to the weakest concept until the owner can reason through it without
hints. Accept correct everyday language; do not require memorized names.

Do not treat "yes, I understand", repetition of your explanation, or an
answer you supplied as proof. Finish the interview only when the relevant
abilities above have been demonstrated, including an unaided end-to-end
explanation and a fresh what-if prediction. There is no fixed question count.
If the owner pauses or stops, respect that and state what remains unverified;
do not claim understanding or walkthrough completion.

## End with the owner's manual test

Once understanding is demonstrated, give the owner what to open or run, the
input to use, and the expected success and failure behavior. Ask them to run
the test and report what happened; wait for their result before marking the
walkthrough complete. Agent-run checks do not replace their manual test.
If it fails, distinguish a build defect from a learning gap before proceeding.

The owner's explain-back goes in `docs/owner/` in their own words. Never write
it for them, and don't paste a ready-made summary they could copy.
