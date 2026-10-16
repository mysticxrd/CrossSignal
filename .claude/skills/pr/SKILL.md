---
name: pr
description: Open the pull request for a built CrossSignal slice, or work one round of reviewer findings on it. Use when a slice passes npm test and npm run lint, after Codex reviews the PR, or when the owner types /pr.
argument-hint: "[PR number]"
---

# Pull request and review rounds

PR: $ARGUMENTS (default: the open PR for this branch, from `gh pr view`).

Each run does one step and stops. Never wait or poll for a review or for CI;
the owner runs `/pr` again once Codex has reviewed. Codex
(`chatgpt-codex-connector`) reviews a PR when it opens and when someone
comments `@codex review`, not on every push.

## No PR yet: open it

1. Review `git diff origin/main...HEAD` as a strict reviewer would. Remove
   dead code, unused exports, debug output, comments that repeat the code and
   changes outside the slice.
2. Run `npm test` and `npm run lint`; commit any fixes.
3. Write the PR body to a scratch file, in four sections:
   - **Why**: the problem, in two or three sentences.
   - **Decision**: the owner's decision and the alternatives they can
     overrule.
   - **Proof**: test and lint results; for prompt, tool or schema changes, B01
     numbers with run id, date and model; how to see the change.
   - **Not in this PR**: what was deferred.
4. Run `git push -u origin HEAD`, then
   `gh pr create --base main --title "<what changes>" --body-file <file>`.
5. Report the link and stop.

## PR open: one review round

1. Check that Codex has finished with the head commit:

   ```bash
   gh pr view <PR> --json headRefOid,comments --jq '.headRefOid, (.comments[] | [.author.login, .body])'
   ```

   The first line is the head commit. Codex keeps one summary comment showing
   its latest review, with status and commit. If that review isn't Completed
   for the head commit, say so and stop. If there is no summary comment, Codex
   isn't set up here: say so and offer `/code-review` as this round.
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
4. If anything was fixed, run `npm test` and `npm run lint`, then commit and
   push. A round that only answers has nothing to commit.
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
6. List the review authors, one line per review, and count Codex's:

   ```bash
   gh pr view <PR> --json reviews --jq '.reviews[].author.login'
   ```

   If this round pushed fixes and Codex has reviewed fewer than three times,
   ask for the next round:

   ```bash
   gh pr comment <PR> --body '@codex review'
   ```

   Stop when nothing is open or after three Codex reviews. Report what was
   fixed, what was answered and what is still open. For a product change, run
   `/walkthrough` next. The owner merges with "Squash and merge".
