# CrossSignal Phase 00 EVE topology spike

This package is an isolated, deterministic **fixture** used to prove one narrow
claim: EVE can own a durable bounded session behind a server-only CrossSignal
adapter while the existing Sites/Vinext application remains unchanged.

It is not a product agent. It has no authored tools, connections, schedules,
subagents, sandbox, D1 access, ICM repository access, provider credentials, or
live model inference. All EVE framework tools are explicitly disabled.

## Runtime contract

- EVE is pinned exactly to `0.32.0`.
- Node 24 or newer is required; the recorded proof uses Node `24.14.0`.
- The model is EVE's documented deterministic `mockModel` fixture.
- The HTTP channel accepts only ES256 JWTs minted by the server adapter.
- Tokens expire after at most 60 seconds and bind actor, workspace, case,
  purpose, allowed tools, ICM head, and policy version.
- Local Workflow state lives under ignored `.eve/.workflow-data` for this spike.

## Verification

Run these commands with a Node 24 executable:

```text
node node_modules/typescript/bin/tsc --noEmit
node scripts/verify-spike.ts
```

The verifier builds EVE, rejects an unauthenticated route call, creates a real
fixture session through `src/crosssignal-eve-adapter.ts`, replaces the EVE
process, retrieves the durable event stream, and continues the same session.
It prints only classified proof data; private keys and bearer tokens remain in
process memory.

The committed acceptance record is
`../build_plans/00_evidence/P00_M4/ACCEPTANCE_EVIDENCE.md`.
