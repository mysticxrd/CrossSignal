---
id: ADR-003
title: Separate Node EVE service behind a signed server adapter
status: accepted
date: 2026-08-11
compatibility_evidence: ../P00_M4/ACCEPTANCE_EVIDENCE.md
---

# ADR-003 — EVE service boundary

## Decision

Keep the Sites/Vinext application and D1 boundary unchanged. Put EVE in a
separate Node.js service behind a narrow `EveRuntime` server adapter. P00-M4
proved this topology with EVE `0.32.0` under Node `24.14.0`; the package requires
Node 24 or newer and builds a self-hosted Nitro Node service. The Sites/Vinext
application remains a separate Cloudflare/D1 deployment with no EVE dependency.

The browser calls authenticated CrossSignal server actions only. The Sites
server authorizes the workspace/case, signs a short-lived execution-context
envelope, and calls EVE. EVE receives no ChatGPT cookie, Git credential,
provider credential, or unconstrained tenant selector.

The Phase 00 spike uses EVE's local Workflow world solely to prove process
restart durability. Selecting and operating a persistent production Workflow
world is deferred; the exact-version docs require it to match EVE's Workflow
protocol line. No product EVE runtime is deployed in Phase 00.

## Execution-context envelope

The Sites boundary signs an asymmetric, short-lived envelope so the EVE service
needs only the verification key. Required claims:

| Claim | Rule |
|---|---|
| `iss`, `aud` | Fixed CrossSignal Sites issuer and EVE audience |
| `sub` | Stable authenticated user ID; no email or display name |
| `workspace_id`, `case_id` | Derived after server membership and ownership checks |
| `purpose` | Allow-listed run purpose such as `investigation` or `measurement` |
| `allowed_tools` | Server policy result; never expanded by EVE/model input |
| `icm_head`, `policy_version` | Expected versions for fail-closed preflight |
| `jti`, `iat`, `exp` | Single-use request ID and lifetime no longer than 60 seconds |

EVE tools use service-to-service CrossSignal endpoints that inject this context
and expose bounded operations. Continuation handles remain encrypted in the
EVE service/D1 mapping and never enter browser props, model context, URLs, or
application logs.

## D1 run mapping

One row per execution attempt records:

- internal run ID, workspace ID, case ID, purpose, trigger, and status;
- exact EVE package, agent, prompt/skill, model, and deployment versions;
- EVE session ID, run ID, encrypted continuation reference, and last cursor;
- ICM base head, latest artifact hash/head, policy version, and budget profile;
- started/updated/finished timestamps, cancellation/retry relation, trace link,
  and content-free error class.

The mapping is an index and recovery aid. EVE owns checkpoint mechanics; ICM
and D1 remain the sources reloaded before every new or resumed consequential
step.

## Fixture adapter boundary

Provider-neutral fixture adapters live behind CrossSignal's read-only MCP/tool
surface. EVE names a bounded query; authenticated server context supplies the
workspace, fixture/provider reference, credentials, maximum window, and result
limit. Fixture content is untrusted data and cannot modify instructions, paths,
capabilities, policy, or the execution envelope.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Browser calls EVE directly | Exposes continuation/security context and bypasses server tenancy |
| Model supplies workspace/case/repository | Makes untrusted output an authorization boundary |
| Assume EVE runs inside the Cloudflare Sites worker | Framework/runtime compatibility is unproven and would couple the durable app to a beta runtime |
| Give EVE direct D1 or Git credentials | Broadens capabilities and makes model-visible/runtime context a credential boundary |
| Use EVE as the development project manager | Violates the program contract; EVE is product runtime only |

## Rollback boundary

The `EveRuntime` adapter is the only product dependency on the service. A failed
spike is removed without modifying the Sites app, D1 data, or canonical ICM
repository. The UI remains a truthful foundation shell until a real run exists.
