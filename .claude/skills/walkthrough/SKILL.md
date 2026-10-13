---
name: walkthrough
description: Teach the owner a built CrossSignal slice file by file before it is committed. Use after building a meaningful slice, before committing, or when the owner types /walkthrough.
argument-hint: "[base ref]"
---

# Walk through the diff

Base: $ARGUMENTS (default: the commit the slice started from, else `HEAD`).

1. Run `git diff --stat <base>` and `git diff <base>`; include untracked files
   from `git status --short`.
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

The owner's explain-back goes in `docs/owner/` in their own words. Never write
it for them, and don't paste a ready-made summary they could copy.
