# Fresh-context gate review

Work in a fresh context: a new session, a subagent or /code-review. Never read
the builder's transcript. Read only the contract, the first primary output,
VERIFY.md and the diff since the previous gate's commit.

Check every acceptance criterion and prohibition. Identify missing evidence,
unsupported claims, boundary violations and meaningful regressions. A loss may
be a valid measured result; missing evidence cannot become a pass.

Write only output/REVIEW.md, using these fields:

    reviewer: fresh-context
    primary_sha256: <normalized SHA-256 of the first primary output>
    verdict: pass|changes-requested

Include a Findings section with concrete evidence and locations, or state that
there are no findings. Use the shared fileHash helper for primary_sha256.
An edited primary output requires another review of its current hash. The gate
binds REVIEW.md as review_sha256. A person decides the gate.
