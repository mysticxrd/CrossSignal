---
type: verification
stage: 03
status: passed
verified_at: 2026-08-13T22:53:30.0816353+05:30
---

# Stage 03 verification

The accepted onboarding-rescue Data package now runs as a durable,
control-first product loop. Verification opens the Build human gate; it does
not accept it.

## Artifact bindings

Text hashes normalize line endings to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `BUILD_EVIDENCE.md` | `9b5b07c376e2ffe44d9015ae500ae597c6e5e68a77818d1196bf29aa013eae34` |
| `../verify.mjs` | `18c77153e5fc1740edb092894c746ca231c212296db0dbb53d70f5941d34114c` |
| `../../../app/CrossSignalApp.tsx` | `f764416effea5014bee700dd42e8368bc2e1ce73d80da9b0dac4098a9998f501` |
| `../../../db/flight-recorder.ts` | `41f248e8e6bc0134552ff75b20f3f8f31f079bb319c05e6af5a28d5a722b70f7` |
| `../../../app/flight-recorder-actions.ts` | `3823f5b3487147b4a9a3f9c691cefed1fb93206527a81e1b229606899fc085c3` |
| `../../../tests/flight-recorder-build.test.mjs` | `79bc737e6f5844410b92ae1d0a8f286a1c7de003955c40e5432210dcb9b67d68` |

The Build Evidence binds all declared Stage 03 inputs, the replayable trace,
and four screenshot hashes.

## Executable evidence

- Six focused Build tests pass for pending-without-authority, immutable edited
  intent, kill-switch denial, exact one-time approval/effect reservation,
  failed and indeterminate no-retry handling, and calibrated FIXTURE outcome.
- The repository derives actor and workspace from authenticated membership,
  reseals the persisted intent, and checks current policy, exact grant,
  recipients, nonce, expiry, spend ceiling, Global Pause, and prior-attempt
  count before reserving the TEST effect.
- A browser golden path edited the proposal before approval and resolved
  `trace_d12fc25947ed88cd` from frozen context through confirmed effect and a
  correlated—not proven—observation.
- A browser negative path showed a TEST provider rejection as failed, exposed
  its reason, made no outcome claim, and performed no retry.
- The React best-practices review found authenticated server actions, direct
  imports, event-bound interaction logic, accessible named controls, and no
  new critical waterfall or client-fetching issue in the bounded slice.

## Command results

Environment: Windows PowerShell, Node.js `22.15.0`, Wrangler `4.92.0`,
Drizzle Kit `0.31.10`, Vinext `1.0.0-beta.2`, Vite `8.0.13`, local Chromium
preview at `http://localhost:3000/`.

| Command / probe | Timestamp (+05:30) | Exit | Relevant result |
|---|---|---:|---|
| `npm.cmd run verify:build` | `2026-08-13T22:53:30` | `0` | `6/6` focused tests; declared input hashes; confirmed, failed, and indeterminate-no-retry safety states. |
| `npm.cmd run build` | `2026-08-13T22:51` | `0` | Five Vinext environments built; dynamic `/` route emitted. |
| `npm.cmd run lint` | `2026-08-13T22:51` | `0` | Active repository ESLint passed. |
| `npm.cmd test` | `2026-08-13T22:56` | `0` | Production build plus all `25/25` tests passed; `0` failed. |
| In-app Chromium golden path | `2026-08-13T22:45–22:52` | `0` | Pause denial, resume, Intent v2 edit, exact approval, confirmed outcome, readable trace. |
| In-app Chromium rejected path | `2026-08-13T22:49` | `0` | Failed with reason, no retry, and no business outcome claim. |

## Gate state

Verification passed. The Build gate is open and human-owned; no later stage is
authorized.
