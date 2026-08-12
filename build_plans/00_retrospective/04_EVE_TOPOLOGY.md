---
id: phase-00-retrospective-gate-04
historical_gate: P00-M4
classification: retrospective-owner-visibility
---

# Gate 4 — EVE topology

## 1. Gate purpose

This gate had to answer: **Can the selected EVE version run behind CrossSignal's
server boundary and recover the same durable session after the EVE process is
replaced?** It mattered because the planned product depends on parked and resumed
work. Assuming EVE could run inside the existing Sites/Cloudflare application
would have put later phases on an untested runtime foundation.

## 2. Starting situation

CrossSignal had no EVE dependency, service, session, Agent Run, or product tool.
The main app supported Node 22. EVE's API was beta and version-sensitive, while
the hosting location and security boundary were unresolved. The PRD required a
pinned version and version-matched documentation before product implementation.

## 3. What was decided

EVE `0.32.0` would run as a separate Node 24 service behind a narrow server-only
adapter. The Sites server would eventually authorize the user/workspace/case and
mint a short-lived ES256 context token; the browser and model would not receive
credentials or choose a tenant. The Phase 00 spike would use EVE's documented
deterministic mock model, local Workflow storage, and zero capabilities solely
to test session durability.

Rejected alternatives were direct browser access, model-supplied tenant context,
giving EVE D1 or Git credentials, assuming EVE could run inside the Cloudflare
worker, or treating the spike as a product agent. Commit `b94b183`, authored by
`mysticxrd`, records the implementation and technical selection. No separate
owner decision or owner-acceptance record exists for this topology gate.

## 4. What was implemented

An isolated `eve-spike/` package pins EVE and related dependencies. Its agent
uses a deterministic fixture model, has no authored tools, connections,
schedules, subagents, or sandbox, and explicitly disables eleven framework tools.
The adapter mints a 60-second token and refuses redirects. The verifier builds
EVE, confirms an unauthenticated request fails, creates a session, stops the
process, starts a new process, retrieves stored events for the same session,
and successfully sends a second turn.

## 5. How CrossSignal changed

- **User-visible:** nothing changed in the deployed product; the UI continued to
  say that no EVE runtime was connected in Phase 00.
- **System-level:** one risky compatibility assumption became executable evidence,
  and the separate-service boundary gained an exact version and runtime requirement.
- **Unchanged:** EVE was not deployed, connected to D1 or ICM, given product tools,
  or used for live inference, human gates, subagents, actions, or measurement.

## 6. Evidence

- Exact package: [`package.json`](../../eve-spike/package.json) and
  [`package-lock.json`](../../eve-spike/package-lock.json)
- Minimal agent and channel: [`agent.ts`](../../eve-spike/agent/agent.ts) and
  [`channels/eve.ts`](../../eve-spike/agent/channels/eve.ts)
- Server adapter and executable restart: [`crosssignal-eve-adapter.ts`](../../eve-spike/src/crosssignal-eve-adapter.ts)
  and [`verify-spike.ts`](../../eve-spike/scripts/verify-spike.ts)
- Recorded result: [`EVE_RESTART_PROOF.json`](../00_evidence/P00_M4/EVE_RESTART_PROOF.json)
- Docs/security review: [`BUNDLED_DOC_INDEX.md`](../00_evidence/P00_M4/BUNDLED_DOC_INDEX.md)
  and [`SECURITY_BOUNDARY_REVIEW.md`](../00_evidence/P00_M4/SECURITY_BOUNDARY_REVIEW.md)
- Gate summary: [`ACCEPTANCE_EVIDENCE.md`](../00_evidence/P00_M4/ACCEPTANCE_EVIDENCE.md)
- Git: `b94b183`.

## 7. Truthfulness classification

The exact dependency pin, compiled EVE service, rejected unauthenticated call,
process replacement, persisted session ID, and retrieved event stream are **real
local runtime behavior**. The model, replies, identities, workspace/case values,
and `icm_head` are **fixtures**. The Workflow world is **local spike storage**,
not production persistence. No sandbox was enabled. Product deployment, D1
authorization/run mapping, canonical ICM interaction, live inference, and Agent
Runs observability were **planned**.

## 8. Limitations and risks

One session on one machine does not prove production availability, multi-instance
coordination, durable remote storage, upgrade compatibility, load, failure during
a consequential tool call, or recovery after deployment. The version requires
Node 24 while the app used Node 22, creating a second service to operate. EVE is
beta, so its exact version and topology may need revisiting before product use.
This retrospective did not rerun the historical process proof.

## 9. What the owner should understand

Phase 00 proved a narrow but genuine fact: EVE 0.32.0 could preserve the fixture
session across local process replacement behind the proposed adapter. It did not
prove an EVE-powered CrossSignal product. Reconsider the separate-service cost,
EVE version, and production Workflow storage before Phase 03 implementation.
