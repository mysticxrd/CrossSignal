# The grader is versioned and out of reach of the change it judges

Pass is a pure function of (run log, answer key, world version, grader version). The grader version hashes the grader, the verifier, the answer-key format, each check's mode and the grader self-test, and it is stamped in every run log and in the pre-registration. From the grader v1 tag, before development batch one, CI reads the list of grader paths from `origin/main` and fails any pull request that touches a grader path together with any other E1 path, or `.github/workflows/` together with E1 code. A grader-only pull request must carry a re-grade of every stored development run log listing each verdict that flipped. A new check enters in observe mode, which logs what it would have flagged, and every check is enforced and frozen before held-out cases are sealed. Half of the planted bad proposals in the self-test are written by Codex, sealed by hash and reported by class only, so the grader is never tuned to its own test. We chose this because a harness change that can also move the grader can buy its own pass, and a held-out score is only worth what the grader that produced it is worth. Adapted from the Claude Code team's practice as Addy Osmani describes it ("How the Claude Code team thinks about verification", X Article, 17 Nov 2026): checks the change can't modify, observe-before-enforce gates, and owners' checks against a control for over-flagging.

## Considered options

- **An addendum to ADR 0002**: 0002 is about sealing held-out cases, but this rule binds every development batch and every grader change, before and after the reveal.
- **The grader inside the harness version**: one hash is simpler, but then a harness change could change its own judge.
- **Enforce every check from the start**: no false-alarm review, and a wrong check on batch one would fail runs for our bug and teach the wrong lesson from error analysis.

## Consequences

- Moving a check from observe to enforce is a grader change, so it re-grades and lists flips like any other.
- Development run logs must outlive their worktree: they are archived in the home checkout, and a committed manifest records each one's hash and verdict per grader version.
- After the reveal, held-out verdicts stand under the pre-registered grader version; a later grader fix re-grades them and reports the flips beside the headline, never in place of it.
- The executor is not part of the grader version; it belongs to the policy version, and property tests over it run against the verifier.
