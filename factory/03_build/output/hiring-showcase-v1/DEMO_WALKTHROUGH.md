# Three-minute demo walkthrough

Rehearse with index.html already open, EVALUATION_REPORT.md beside it and the
terminal at the authoritative checkout. This current rehearsal shows saved
rules/failure evidence. A successful Gemini investigation remains blocked;
do not label the rehearsal as a finished end-to-end AI demo.

## 0:00–0:20 — the product and the current truth

"CrossSignal turns a synthetic revenue drop into an inspectable Case. I want
to show the evidence an investigator used, the alternatives it considered and
the next step it can justify. Today the Gemini route is blocked by a retained
HTTP 400, so I can demonstrate the saved evidence, failure boundary and reload
without inventing a model answer."

Point to SIMULATED, the original-run provenance and zero valid Gemini findings.
Keep business purpose first: a person needs an explanation they can inspect.

## 0:20–0:55 — an observation becomes a readable Case

Open the rules Case. Show received revenue windows, the affected segment and
one cited engineering observation. Expand a supporting ID to its raw values.
"The rule sees the same allowed universe as the two model methods. It records
a hypothesis and a recommendation. It currently records no contradictory
evidence or atomic claims, so I expose that limitation."

Do not call this Gemini reasoning or independently correct diagnosis. Stable
IDs make claims inspectable; citation membership alone is not semantic support.

## 0:55–1:25 — failed generation and safe next steps

Open the single-shot failure. Show started → token_count → request → terminal.
"The host committed the request before dispatch. Gemini rejected it. I retained
the failed scored attempt, stopped the batch and kept generation usage unknown.
There was no retry or paid fallback. The error body was discarded, which limits
diagnosis; the next repair is bounded secret-free diagnostics and offline schema
review. A transport error is not an evidence-based abstention."

Point to the exact HTTP status and unknown usage. Do not guess the parameter
cause or make a new request during the demo.

## 1:25–1:55 — the engineering boundary

Show ARCHITECTURE.md and the three code paths: gemini-runner.mjs,
gemini-isolation.mjs and gemini-store.mjs.
"One trusted host holds the credential and budget. Fresh workers prepare only
synthetic observations and allowed results; model outputs can request three
read-only tools. Identity and limits come from the host. Recommendations don't
invoke the existing authority/execution components."

Name the 8192/1024/6144 token bounds and 180s/900s deadlines. Point to the real
forbidden-read/write/process probes and durable-failure tests. Hidden reasoning
text is discarded; reasoning token counts still matter. Node permissions are
not a general OS/network sandbox; trusted code evaluates no model program.

## 1:55–2:25 — cold reload without inference

Run:

```powershell
node factory/03_build/output/hiring-showcase-v1/prepare.mjs --replay
```

Show the same snapshot/database hashes. "This opens the existing terminal
records read-only, checks the frozen observations and timeline chain, and
returns the same Case. It doesn't regenerate an answer or retry a request."

## 2:25–3:00 — the small evaluation and remaining work

Show EVALUATION_REPORT.md and CONTRACT_CHANGE_PROPOSAL.md.
"I propose five frozen cases and one fresh run for each of three methods:
15 records. Failures and abstentions stay in the denominator. That can show
retrieval choices, citations, counterevidence and practical costs; it cannot
establish robust accuracy or variability. I am deferring the repeated study,
measured improvement and intervention from the first hiring showcase. The
larger accepted B01 milestone stays incomplete."

End with the next concrete review: accept/change/reject the exact scope overlay,
then resolve Gemini compatibility and the additive preservation review before
new scored calls. No stage advance, deployment or runtime intervention.

## Once the proposed study is accepted and actually completed

Replace 0:20–1:25 with one real saved tool-using Gemini Case. Show its ranked
explanations, one purposeful counterquery, supporting and contradictory IDs,
and a justified next step or epistemic abstention. Show an actual retained
failure afterward. Update the narration only from recorded outputs and separate
adjudication; never copy a rules/fixture answer into the Gemini section. Keep
the same three-minute timing and make no live demo calls necessary.
