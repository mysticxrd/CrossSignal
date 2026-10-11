# Owner notes

This folder is mine. Every note here is my own explanation of what I built, in
my own words. Claude and Codex may read these notes, question them and point out
errors. They never write here; a hook in `.claude/settings.json` blocks Claude's
file and shell tools from changing this folder.

## One note per meaningful slice

A meaningful slice changes behaviour, a prompt, a tool, state, retries,
idempotency or authority, or backs a claim the demo or a post makes. Chores
(typos, renames, dependency bumps) don't need a note.

Name the note `YYYY-MM-DD-<slice>.md` and start it from `_template.md`, either
by copying it or with `/slice <name>` from the owner-loop mod, which fills
part 1 from what I type and adds the date and base commit.

| Part | When I write it |
|---|---|
| 1. Prediction | Before asking for a design |
| 2. Product note | Before saying "build" |
| 3. Explain-back | After the walkthrough, from memory, without looking at it |
| 4. Where I was wrong | After comparing 1 with the real design |
| 5. The part I wrote | After writing the `TODO(human)` piece myself |

A slice is done when parts 3 to 5 are written. Until then it doesn't merge.

## Weekly question

What can I explain today that I couldn't explain last week? The answer is the
week's post.

## Rhythm

About 70% building, 30% understanding: walkthroughs, `/grill`, `/drill` and
these notes. Use AI to multiply implementation speed, not to outsource
understanding.
