---
eve_version: 0.32.0
docs_root: eve-spike/node_modules/eve/docs
package_integrity: sha512-b1+JLZIAucpW6eVxdyLKlKp0sJ20F737TEe+wj6vYzhq5JPz5n9bdoTCvh5Z1Q7TFGLO0GSIub/q9b8UGVb28Q==
reviewed: 2026-08-11
---

# EVE 0.32.0 bundled documentation index

The package was pinned and installed before any EVE source was written. The
following bundled, version-matched documents were read completely for the
chosen HTTP channel, fixed-session client, human interaction, subagent posture,
security boundary, and self-hosted deployment path.

| Area | Bundled documents | Decision informed |
|---|---|---|
| Orientation | `README.md`, `getting-started.mdx`, `installation.mdx`, `project-structure.mdx`, `reference/project-layout.md` | Filesystem layout, Node 24 requirement, discovery/build workflow |
| Agent/API | `agent-config.md`, `reference/typescript-api.md`, `concepts/context-control.md`, `guides/session-context.md` | Deterministic fixture model, limits, runtime context boundaries |
| Tools/HITL | `tools/overview.mdx`, `tools/human-in-the-loop.md`, `concepts/default-harness.md`, `sandbox.mdx` | Disable every framework tool; no sandbox; understand durable parking without implementing a product gate |
| Channel/auth | `channels/overview.mdx`, `channels/eve.mdx`, `guides/auth-and-route-protection.md`, `concepts/security-model.md` | Built-in EVE HTTP channel, fail-closed ES256 route auth, server-only credential handling |
| Session/client | `concepts/sessions-runs-and-streaming.md`, `guides/client/overview.md`, `guides/client/messages.md`, `guides/client/streaming.md`, `guides/client/continuations.md` | Fixed durable session ID, serializable cursor, bounded snapshot and reconnect behavior |
| Subagents | `subagents.mdx` | No declared subagent and explicit removal of root delegation for the minimal spike |
| Durability | `concepts/execution-model-and-durability.mdx` | EVE owns execution checkpoints; completed steps replay and local Workflow state persists |
| Deployment | `guides/deployment/overview.md`, `guides/deployment/vercel.mdx`, `guides/deployment/self-hosting.md`, `reference/cli.md` | Separate Nitro Node service; local world only for the spike; production world selection remains deferred |
| Fixture model | `evals/overview.mdx` | Use the documented `mockModel` in a dedicated fixture agent with no provider credential |

## Version conclusions

- `eve@0.32.0` declares `node >=24`; the existing application declares
  `node >=22.13.0` and targets Sites/Cloudflare. A separate service avoids
  coupling the durable application build to EVE's runtime contract.
- The self-hosted build writes `.output/`; local Workflow state is stored under
  `.eve/.workflow-data` and survives process replacement.
- A production self-host must mount persistent storage or select a compatible
  installed Workflow world. That is a later deployment decision, not a Phase 00
  production claim.
- The EVE session API returns a fixed session ID and stream cursor. It does not
  require a continuation token in the CrossSignal adapter or browser.
