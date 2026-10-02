# Three-minute walkthrough — current inspectable evidence

This is a failure-handling walkthrough. A successful Gemini end-to-end demo is
still blocked. Keep that distinction visible when practicing for an interview.

**0:00–0:30 — State the product goal.** Open index.html. “CrossSignal turns a
revenue signal into a saved Case: competing explanations, supporting and
contradictory evidence, and a justified next step. This packet uses synthetic
data. Today the provider rejected the request, so I can show the safeguards and
durable failure record, but cannot claim a completed model investigation.”

**0:30–1:05 — Show the signal and boundary.** Open the saved tool-using Case and
expand permitted synthetic observations. Explain that the trusted host binds
workspace, Case, run and cutoff. The model can propose one of three read-only
queries; it cannot access private truth, the rubric, previous answers, your
development conversation, files, credentials or runtime actions. Point to the
original limits in README.md.

**1:05–1:45 — Show the actual failure.** Expand the ordered timeline. Point out
the counted request and durable dispatch lease before generation, then the
terminal indeterminate_usage result. “HTTP 400 means the request was rejected;
it tells me nothing about the model's diagnostic accuracy. Missing server usage
stays unknown. The batch stopped without a retry or fallback.” Show one saved
record and 14 NOT_RUN in the schedule.

**1:45–2:15 — Reload the same Case.** From the authoritative product directory,
run the read-only command:

```powershell
node factory/03_build/output/hiring-showcase-v1/continuation-v1/repair-v1/review.mjs --reload
```

Show that the database and timeline hashes match the viewer. Reload checks the
manifest, frozen sources, scope, observations and terminal history; it makes no
model request and replays no effect.

**2:15–2:45 — Explain the engineering choices.** Open ARCHITECTURE.md and the
code paths for budget, restricted worker, transport and store. “I kept the
provider behind a small adapter and used existing Node dependencies. I tested
the entire 15-record schedule with explicit fixtures, then preserved the real
rejection separately. Prompt instructions alone are not the isolation boundary.”

**2:45–3:00 — State the remaining gap.** Open EVALUATION_REPORT.md. “The next
technical step is a bounded, reviewed diagnostic continuation. The accepted
small study has no accuracy claim yet. Scope acceptance is separate from Build
acceptance, and neither grants runtime intervention authority.”

When a real successful finding exists, revise the current walkthrough
additively around explanations, support/counterevidence and recommendation.
Do not present an offline fixture or old deterministic Case as that result.
