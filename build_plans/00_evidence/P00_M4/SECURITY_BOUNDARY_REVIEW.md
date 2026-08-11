# P00-M4 security-boundary review

## Inbound authorization

`eve-spike/agent/channels/eve.ts` replaces EVE's placeholder policy with
`jwtEcdsa` using ES256, a fixed issuer/audience, a bounded subject pattern, and
fixed `purpose` and `policy_version` claims. The automated proof verifies that
an unauthenticated info request is rejected before the fixture session begins.

The CrossSignal adapter mints a fresh JWT for every client request. It binds the
actor, workspace, case, purpose, empty tool allow-list, expected ICM head, and
policy version; `exp` is at most 60 seconds and each token receives a new `jti`.
The client uses `redirect: "error"`, preventing credential-bearing requests from
following redirects.

## Secret and continuation handling

- The ES256 private key exists only in verifier/adapter process memory.
- Only the public key is passed to the EVE process.
- Neither bearer tokens nor private keys are returned, persisted as proof, or
  written by authored logging code.
- `EVE_TRACES_CONTENT=off` suppresses prompt/tool payloads in local trace output.
- The adapter uses EVE's fixed session ID plus numeric stream cursor; it never
  reads, stores, prints, or sends a continuation token.
- The root application has no `eve` dependency or browser import. The spike
  cannot be reached from current browser props or client code.

## Capability surface

The compiled EVE summary reports zero authored tools, connections, schedules,
subagents, and no sandbox. Eleven `disableTool()` sentinels remove every static
framework tool known to EVE 0.32.0, including shell/filesystem, web, HITL,
skills, todo, and root delegation. The deterministic fixture model therefore
has no product or external side-effect capability.

## Explicit non-claims

- This does not prove D1 operational authorization or run mapping; those are
  future product work and remain D1-owned.
- This does not prove an ICM repository interaction; the signed ICM head is a
  fixture string.
- This does not select or operate a production Workflow world, deploy EVE, or
  exercise live inference.
- The local Workflow files are durable spike state, not a permanent business
  ledger. D1 remains the planned permanent operational record.
