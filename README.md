# CrossSignal

CrossSignal is a Revenue Flight Recorder: a human-reviewed loop from business
signal to evidence, intervention, measured outcome, and accepted learning.

The phased ICM + EVE development program starts at
[`build_plans/AGENTS.md`](build_plans/AGENTS.md). The complete phase map is in
[`build_plans/00_PROGRAM.md`](build_plans/00_PROGRAM.md), with one executable
build plan per phase and full PRD/eval ownership in
[`build_plans/TRACEABILITY.md`](build_plans/TRACEABILITY.md).

## Current foundation

The private demo shell runs on [vinext](https://github.com/cloudflare/vinext)
with Sites authentication, Cloudflare D1, and checked-in Drizzle migrations.
It currently persists owner workspaces, one versioned synthetic case fixture,
immutable fixture observations, approvals, case cycles, and an additive ledger.

This is the Phase 00 foundation, not a live-integrated or production-ready
release. Provider health, EVE work, sandbox actions, deterministic measurement,
the Git-backed ICM Company Brain, Lab publication, schedules, and stored evals
remain explicitly phased work.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included shape

- edit site code under `app/`
- `.openai/hosting.json` declares the Sites D1 binding; R2 is unused
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` defines the current durable product schema
- `drizzle/` contains the canonical checked-in migration history
- `build_plans/00_evidence/` contains inspectable Phase 00 acceptance evidence
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build CrossSignal and run the current structural/database tests
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
