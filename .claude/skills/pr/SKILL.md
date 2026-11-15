---
name: pr
description: Review and open the pull request for a built CrossSignal slice, work Codex's findings on it, or clean up after the merge. Use when a slice passes npm test and npm run lint, after Codex reviews the PR, after the owner merges it, or when the owner types /pr.
argument-hint: "[PR number]"
---

# Pull request: review, open, answer, clean up

PR: $ARGUMENTS (default: this branch's PR, from `gh pr view`).

Each run does one step and stops. Never wait or poll for a review or for CI;
the owner runs `/pr` again once Codex has reviewed, and once more after
merging. Codex (`chatgpt-codex-connector`) reviews a PR when it opens and when
someone comments `@codex review`, not on every push.

## No PR yet: review it, then open it

1. Run `git fetch origin` and `git log --oneline origin/main..HEAD`. The list
   must hold this slice's commits only. If it shows another slice or an
   unmerged branch, stop and say so: the slice is rebuilt on `origin/main`
   before it gets a PR, because a PR stacked on another branch merges into
   that branch and never reaches main.
2. Review the diff locally. Claude: run the built-in `/code-review` on this
   branch. Codex: read `git diff origin/main...HEAD` as a strict reviewer
   hunting bugs. Fix each real finding. Remove dead code, unused exports,
   debug output, comments that repeat the code and changes outside the slice.
3. If the slice has a ticket in `.scratch/<slug>/issues/`, tick its acceptance
   criteria and set its `Status:` to `done`.
4. Run `npm test`, `npm run lint` and `npm run typecheck`, the three checks CI
   runs; commit any fixes.
5. Write the PR body to a scratch file, in five sections:
   - **Why**: the problem, in two or three sentences.
   - **Decision**: the owner's decision and the alternatives they can
     overrule.
   - **Proof**: test and lint results; for prompt, tool or schema changes, the
     numbers from the benchmark the change touches (B01, or the
     order-recovery reports) with run id, date and model; what the runs read
     as well as what they scored; the prediction written before the runs; how
     to see the change.
   - **Assumptions**: what the proof depends on, one line each, with the one
     that no test or run checks marked "untested". Reviewers check these, not
     only the diff.
   - **Not in this PR**: what was deferred.

   Under Proof, list what the local review found and what was fixed.
6. Run `git push -u origin HEAD`, then
   `gh pr create --base main --title "<what changes>" --body-file <file>`.
   Title a ticketed slice with its ticket title.
7. Report the link and stop.

## PR open: work Codex's review

1. Check that Codex has finished with the head commit:

   ```bash
   gh pr view <PR> --json headRefOid,comments --jq '.headRefOid, (.comments[] | [.author.login, .body])'
   ```

   The first line is the head commit. Codex keeps one summary comment showing
   its latest review, with status and commit. If that review isn't Completed
   for the head commit, say so and stop. If there is no summary comment, Codex
   isn't set up here: say so, and the local review stands as the review.
2. List the unresolved review threads:

   ```bash
   gh api graphql -F owner='{owner}' -F repo='{repo}' -F number=<PR> -f query='
   query($owner: String!, $repo: String!, $number: Int!) {
     repository(owner: $owner, name: $repo) {
       pullRequest(number: $number) {
         reviewThreads(first: 100) {
           nodes {
             id isResolved path line
             finding: comments(first: 1) { nodes { author { login } body url } }
             latest: comments(last: 1) { nodes { author { login } body url } }
           }
         }
       }
     }
   }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not)'
   ```

   A finding is open while its thread is unresolved and the reviewer wrote the
   latest comment. Work from that latest comment: when it isn't the first, the
   reviewer has answered a reply.
3. Fix each open finding, or decide to answer it with a one-line reason.
   Answer instead of fixing when a finding contradicts the owner's decision.
4. If anything was fixed, run `npm test`, `npm run lint` and
   `npm run typecheck`, then commit and push. A round that only answers has
   nothing to commit.
5. Reply on each thread. For a fixed finding, reply and resolve:

   ```bash
   gh api graphql -f id=<thread id> -f body='Fixed in <sha>: <what changed>' -f query='
   mutation($id: ID!, $body: String!) {
     addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $id, body: $body}) { comment { url } }
     resolveReviewThread(input: {threadId: $id}) { thread { isResolved } }
   }'
   ```

   For an answered finding, send the reply without `resolveReviewThread` and
   leave the thread open for the owner. Keep each reply to one line with no
   quotes or apostrophes, so it survives both Bash and PowerShell.
6. Report what was fixed, what was answered and what is still open, then
   stop. Codex reviews once. Only when the owner asks for another review, send
   `gh pr comment <PR> --body '@codex review'`.

   On the last slice of a product task, run `/walkthrough` next. The owner
   merges with "Squash and merge".

## PR merged: clean up

1. Confirm the merge reached main:

   ```bash
   gh pr view <PR> --json state,baseRefName --jq '.state, .baseRefName'
   ```

   Go on only for `MERGED` into `main`. For any other base, say that the work
   is not on main yet and stop.
2. In the worktree, run `git status --short`. If it lists work that isn't in
   the PR, say so and stop.
3. Copy a batch a report cites, under `outputs/`, to the home checkout
   (`CONTEXT.md`, Local only).
4. If the worktree's `node_modules` is a link to another checkout's, unlink it
   first, or deleting the folder empties the shared copy:
   `cmd /c rmdir <worktree>\node_modules`.
5. From the home checkout, run `git worktree remove <worktree>`, then
   `git branch -D <branch>`; a squash merge leaves the branch looking
   unmerged, so `-d` refuses it.
6. Bring the home checkout up to main, so the next session started there
   loads the merged `AGENTS.md` and skills. In it, run `git fetch origin` and
   `git rev-list --count origin/main..HEAD`. At 0, run
   `git merge --ff-only origin/main`. Above 0 its branch holds unmerged work:
   leave it and report how many commits it is behind main.
7. Report what was removed and, for a task with tickets, the title of the
   next ticket whose blockers are done.
