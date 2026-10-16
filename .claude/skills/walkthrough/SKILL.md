---
name: walkthrough
description: Teach the owner a CrossSignal pull request file by file before they merge it, ending with the manual test. Use after /pr on a product change, before merging, or when the owner types /walkthrough.
argument-hint: "[base ref]"
---

# Walk through the diff

Base: $ARGUMENTS (default: `origin/main`).

1. Run `git fetch origin`, then `git diff --stat <base>...HEAD` and
   `git diff <base>...HEAD`; include uncommitted and untracked files from
   `git status --short`.
2. Order the files the way a request travels: entry point first, then each
   call in turn, tests last. For each file give a `file:line` link, what it
   does in one sentence and why it changed.
3. Then cover, in plain words before technical terms:
   - control flow: one request from trigger to stored result;
   - types and data shapes that cross a boundary;
   - state transitions: what is written where, and in which order;
   - side effects: model calls, network, database writes, files;
   - failure paths: what happens at each failure point, what retries, what is
     idempotent, and what a person sees;
   - the three concepts this change relies on, each with a short analogy and
     then its proper name.
4. Point to the owner's decision: where it lives in the code, which
   alternative was built and why, and what goes wrong if it was decided badly.
5. Ask the owner to trace one request end to end in their own words. Check
   their answer against the code, correct it with `file:line` references, and
   ask a follow-up on the weakest part.
6. End with the manual test: what to open or run, the input to use, and what
   the owner should see when it works and when it fails. Show any UI
   screenshots from the build here.

The owner's explain-back goes in `docs/owner/` in their own words. Never write
it for them, and don't paste a ready-made summary they could copy.
