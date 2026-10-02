# Discussing the engineering work

Keep the distinction between implemented safeguards, recorded outcomes and
planned model behavior visible. The current evidence demonstrates software
mechanics and retained failure handling. A successful Gemini investigation and
the proposed small evaluation are still blocked.

## Explain the product decision

"The useful artifact is a saved Case: what changed, what evidence matters,
which explanations compete and what next step is justified. I reduced the
initial showcase to one workflow and five cases so an interviewer can inspect
it quickly. The reduction is proposed explicitly; it doesn't rewrite the larger
accepted benchmark or turn 15 runs into an accuracy claim."

Result combines analytics, AI and shared company context in its
[public product](https://result.dev/). Relating CrossSignal's workflow to that
surface is a product-fit inference. Ask about the team's real priorities in
the interview; do not invent its architecture or hiring criteria.

## Explain the model boundary

"The API model chooses queries and explanations. It cannot choose tenant,
actor, credentials, policy or a file path. One host validates and records every
step. Fresh workers see synthetic observations, task/schema and bounded results,
not evaluator truth or my development conversation. This makes deliberate
leakage and malformed-tool tests possible."

Open contracts.mjs, gemini-context.mjs and gemini-isolation.mjs. Be precise:
Node permissions are not a complete same-user OS/network sandbox. No model
code is evaluated and no network/file/effect tool is exposed; the actual read,
write, environment and process denial tests support that constrained boundary.

## Explain why the three methods help

Rules provide an evidence-driven baseline, single-shot exposes the full allowed
universe once, and tool-using Gemini must retrieve evidence purposefully. Same
data/cutoff/task/model settings limit confounding. Eager versus queried evidence
and compute are intentional differences, so tokens, latency, missed retrieval
and countersearch are reported. One run each cannot estimate model variability.

Do not claim the tool model wins: it has not returned a scored finding yet.
The current rules Case has 16 support references but no contradiction IDs or
atomic claims. That is an inspectable gap, not a polished competing-explanation
model demo or independent proof that all support is relevant.

## Explain durable failure handling

Open gemini-runner.mjs at the append(request) before transport.generate call,
then inspect the saved failed Case timeline. A request can be dispatched before
the host knows whether the provider generated anything. Preserve the lease and
unknown usage; do not quietly reset budget or retry an indeterminate attempt.
SQLite foreign keys bind scope; atomic append and hash validation support cold
reload. Hash chains detect accidental corruption, not an adversary controlling
the whole machine and recomputing every hash.

The showcase reader deliberately uses SQLite readOnly=true instead of the
store constructor's writable setup. Reloading the same terminal Case is neither
a new model sample nor executing an incomplete effect.

## Explain the concrete failure and next repair

"Model metadata and request counts passed, then generation returned HTTP 400.
I stopped after that scored attempt. I didn't substitute a different model or
make a smoke call. Discarding the error body protected against unrestricted
payload logging but also removed parameter diagnostics. The better repair is
bounded allowlisted diagnostics with secret filtering, verified offline first."

The exact rejected parameter is unknown. Do not call it a quota issue, a schema
bug or poor reasoning without evidence. Preserve the original executing code
and failed store; repair and future scored attempts need fresh source bindings.
MINIMAL thinking still requires reasoning-token accounting. Explain the
8192/1024/6144 token limits, shrinking output reservation and abort deadlines.

## Explain what is deliberately deferred

Twenty extra initial repeats, the 15-run preregistered change experiment and the
exact runtime-human intervention are outside the first proposed showcase.
This sacrifices variability/improvement/effect evidence, not isolation, immutable
history, evidence grading or authority safeguards. The larger B01 stays
incomplete. Existing lint and preservation blockers are disclosed; no test or
accepted source was rewritten to create a green story.

For questions about production readiness, point to the absent real integrations,
actual device/payment proof and operational evaluation. Synthetic observations
cannot establish business recovery. The next useful evidence is an actual saved
Gemini tool investigation under verified Free-tier conditions, followed by the
small method comparison and independent review.
