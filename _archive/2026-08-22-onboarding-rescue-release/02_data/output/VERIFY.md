---
type: verification
stage: 02
status: passed
verified_at: 2026-08-13T13:19:03.0594077+05:30
---

# Stage 02 verification

The accepted Spec is executable as a tenant-bound, replayable Data package.
Verification opens the human gate; it does not accept the package.

## Artifact bindings

Text hashes normalize line endings to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `DATA_PACKAGE.md` | `bc63fbcec2cfb8ba70cf8286dbb2f8cbca2f02272b9b07b1eea918b6072e32b0` |
| `../verify.mjs` | `3f5140e02d9cb9f7bad5c4f650d3711b09ace0c19be0564e37f23794fbf756b3` |
| `../fixtures/onboarding-rescue.fixture.mjs` | `aeb7e0d1b977f90682d473efdbe88dafdb82d498682578f26a894c682cf0083d` |
| `../fixtures/reset.mjs` | `79e3261492955e78cfa708d25b503865d033f06b7d308d5b65790009d4068a2e` |
| `../../../drizzle/0004_typical_omega_red.sql` | `7faff14fddee736cf378e9010f4a1c113f20049f4d9714caf676f6296cf792b4` |
| `../../../drizzle/0005_flight_recorder_guards.sql` | `17f5a4ffb041d4a3851c9ff441fe61a44274d687c1cbc917356bd247fe6094a7` |

The Data Package separately binds all 17 declared upstream and implementation
inputs, including the accepted Spec gate and LF policy.

## Executable evidence

- Eight shared state machines and seven focused contract tests passed.
- Six journal-aligned migrations and their complete snapshot ancestry passed
  `drizzle-kit check` and applied to a fresh local D1.
- The fresh database contained all 18 Stage 02 tables, all 53 Stage 02 guards,
  and zero foreign-key violations.
- The complete canonical fixture was inserted through legal durable state
  transitions: five evidence/context sources, six reasoning nodes/artifacts,
  exact intent/policy/grant/effect authority, three effect events, one observed
  outcome/assessment, and seven ordered trace events.
- Fourteen independent database attacks were rejected, including tenant drift,
  truth mutation, illegal transitions, parent deletion, incomplete or drifted
  context, canonical intent drift, kill-switch execution, cross-trace events,
  duplicate/out-of-order events, and a supported claim from FIXTURE evidence.
- Exact reset removed only the canonical FIXTURE trace and preserved its
  workspace, authority control, and an unrelated non-fixture trace.

## Command results

Environment: Windows PowerShell, Node.js `22.15.0`, Wrangler `4.92.0`,
Drizzle Kit `0.31.10`, Vinext `1.0.0-beta.2`, Vite `8.0.13`.

| Command | Exit | Relevant result |
|---|---:|---|
| `npm.cmd run verify:data` | `0` | `7/7` focused tests; 18 tables, 53 guards, 14 rejected D1 attacks, exact reset proof. |
| `npm.cmd run build` | `0` | Production build completed. |
| `npm.cmd run lint` | `0` | Active repository lint passed. |
| `npm.cmd test` | `0` | Production build and all `19/19` tests passed; `0` failed. |

## Gate state

Verification passed and the Stage 02 human gate is open. Stage 02 remains
`in-progress` until a human accepts the exact Data Package and verification
hashes recorded in `HUMAN_GATE.md`.
