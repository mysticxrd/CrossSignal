---
type: contract-amendment-proposal
status: proposed-not-applied
decision: pending
profile: b01-siwc-measured-v1
---

# Proposed subscription measurement profile

This is a concrete change to the accepted benchmark limits, not a finding that
SIWC satisfies them. No scoring or upstream artifact edit is authorized by this
document. Reference Spec SHA-256:
`e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e`;
Data SHA-256:
`ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f`.

## Exact proposed substitutions

| Accepted condition | Proposed replacement for this distinct experiment |
| --- | --- |
| working-context-tokens = 8192, including next output | Hard host admission ceiling: 8192 UTF-8 bytes of the complete serialized JSON request body, including task/schema and all current-run tool requests/results. Reject oversized requests before dispatch as context_overflow; no truncation, history deletion or missing decisive facts. Report provider input tokens after each response. No hard combined input-plus-generated-output token guarantee is claimed. |
| output-tokens-per-response = 1024 maximum | Post-response qualification threshold = 1024 provider output tokens, inclusive of the reported reasoning subset. Overshoot terminates budget_exhausted, preserves visible output/counts and remains in the failure denominator. It is not a maximum on remotely generated tokens. |
| generated-tokens-per-investigation = 6144 maximum | Post-response cumulative stop threshold = 6144 provider output tokens across all attempted responses, including failed/incomplete responses where reported. Do not dispatch if cumulative known usage is already at/above threshold. A response may overshoot the remaining threshold; retain full reported counts, terminate budget_exhausted and make no further request. Do not claim bounded total generated tokens. |
| No opaque unlimited reasoning | Set the same low reasoning effort for both methods, retain counts, disclose that this does not cap reasoning numerically. Never retain or feed hidden reasoning back into a request. |
| Verify free-tier/account at $0; unrelated subscription is insufficient | Verify CrossSignal's own SIWC client/grant and the selected account's existing plan allowance; credit access disabled/zero, no credits/purchases/API-key billing/paid fallback. The user explicitly authorizes only wholly subscription-covered benchmark calls. Quota or unknown allowance/billing stops the run; do not automatically resume/retry it. |

All other accepted constraints remain: 12 attempted model turns, 10 attempted
read-only queries including invalid attempts, 50 scoped rows per query, 160 query
characters, 180-second request/900-second investigation monotonic client deadlines,
concurrency one, zero inference retries, same model/configuration, three fresh
replicates, frozen experiment, all failure denominators and separate runtime
authority. Deadlines cancel client work; no remote-compute-time guarantee is
inferred from cancellation.

Before dispatch, fail on an unverified account/model/plan grant, unknown remaining
allowance, app credits enabled, an oversized body, expired deadline, exhausted
turn/tool budget, existing in-flight request or missing ledger state. Log the
attempt before dispatch. No repair call, compaction, hidden follow-up or fallback.
If terminal usage is absent or inconsistent, mark usage unknown, close the
investigation and block further model dispatch for the session until reconciled.
Do not treat partial usage as zero or replay a possibly completed request.

Frozen output and Data contracts, synthetic evidence universe, evaluator/rubric,
case splits and 50 planned artifacts are unchanged. Tool requests/results from
this run accumulate in fresh requests; previous answers and development-chat
context do not. Query history must be retained whole even when it causes a context
failure. The byte ceiling applies equally to both model methods. The deterministic
comparator retains the full allowed observable universe.

## Tradeoff and decision

The proposed profile permits subscription measurement with honestly recorded
overshoot and context failures. It gives up the accepted hard guarantees on
response/total generation and combined token context. Results must be labeled
`b01-siwc-measured-v1`, without resource-equivalence claims against the hard-bound
contract. Low reasoning may use most/all of the output threshold before visible
text. Ten legal tool queries may exceed the byte ceiling; those failures stay in
the denominator and cannot be repaired silently.

Human choices:

1. Retain the accepted hard bounds. Keep SIWC scoring blocked until the supported
   route provides enforceable generation controls; no paid alternative is implied.
2. Accept this exact measured profile, followed by an additive governed Spec
   amendment and Data compatibility review. Retain accepted originals and hashes;
   refresh affected acceptance/freshness bindings through the factory's human
   gates before freezing a new experiment. This proposal alone does not close the
   Build gate or authorize an intervention.

`CONTRACT_REVIEW.md` records no decision and binds this exact proposal. The
adapter's execution guard remains closed. This preparation neither edits accepted
limits nor manufactures human acceptance.

The incompatibility is documented in the
[official SIWC preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
The repository rule is Stage 03 Process 1, "Require accepted/fresh Data and explicit
provider/model/spend conditions," and its failure routing, "Fix this stage or
upstream contract; preserve initial results when applying the one measured change."
[Active stage](../../CONTEXT.md).
