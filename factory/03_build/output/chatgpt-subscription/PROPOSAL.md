---
type: provider-proposal
stage: 03_build
status: prepared-pending-review
provider: openai-chatgpt-subscription
candidate_model: gpt-6.1-sol
model_evaluation: NOT_RUN
---

# CrossSignal subscription integration proposal

The current proposal replaces Gemini with Sign in with ChatGPT (SIWC), using
the public Responses endpoint and CrossSignal's own OAuth registration. Candidate
model: `gpt-6.1-sol`, reasoning effort `low`, same configuration for both model
methods. This is a candidate until the selected account's live catalog and the
configuration review confirm it. Previous Gemini preparation remains preserved.

## Supported route and eligibility

Eligible Plus/Pro accounts can share plan usage with participating applications.
The preview admits open-source partners and selected private clients. This local
checkout has no verified CrossSignal registration or plan-use grant; locality and
a Plus subscription alone do not establish client eligibility.
[Official quickstart](https://developers.openai.com/siwc/quickstart).

The local-app flow dynamically registers a client; registration is tied to the
chosen user/workspace. Use a persistent opaque host UUID, fresh state/nonce/PKCE,
an exact `127.0.0.1` callback, the returned issued client ID, ID-token verification
against trusted OpenAI keys and granted `resource.invoke chatgpt.tokens.use.direct`
scopes. Never reuse Codex credentials or client registration.
[Local-app overview](https://developers.openai.com/siwc/token-sharing-open-source),
[Registration](https://developers.openai.com/siwc/token-sharing-open-source/sign-in).

Read-only desktop account inspection reported Plus and no credits.
`ELIGIBILITY_OBSERVATION.json` retains those facts, without
account identifiers or credentials. It is evidence about the desktop account,
not a CrossSignal grant, catalog, allowance reservation or billing guarantee.

After sign-in, `GET https://api.openai.com/v1/models` must use the same OAuth
access token as inference. Only an account-visible catalog entry can confirm the
selected slug. Cached Codex choices are insufficient. Requests go to
`POST https://api.openai.com/v1/responses`; there is no API-key or backend-api route.
[Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).

The public model reference supports `low` reasoning, structured output and
streaming; it does not offer `none`/`minimal`. A model's large native context does
not override the accepted benchmark's smaller budget. No ordinary API price or
rate tier is being applied to subscription usage.
[Model reference](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

Plus usage is shared across apps. ChatGPT app settings manage plan and credit
access separately. Before dispatch, verify CrossSignal can use existing allowance
while credit access is disabled/zero and no purchased balance or fallback is
available. Stop on quota/eligibility/policy errors; no purchase or automatic retry.
[Accounts and usage](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions),
[Errors](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery).

## Prepared adapter

`db/benchmark/provider-config.mjs` is the active configuration proposal.
`subscription-auth.mjs` supplies pure PKCE/callback/identity/catalog validation
helpers; it does not open a browser, create a listener, fetch keys, exchange tokens
or store credentials. Signature tests use generated fixture keys. A real listener,
trusted OpenAI discovery/JWKS verification, protected Windows credential storage,
refresh serialization and the account-specific eligibility check remain to be
completed after the contract decision. No credentials were inspected or copied.

`subscription.mjs` constructs fresh HTTP request bodies and inspects fixture SSE
streams. Each turn contains only the public task/definitions/schema, synthetic
scoped observations and this run's bounded read-only query requests/results.
Supplied results are rejected and recomputed locally. No previous assistant
answer, response/thread ID, private world, rubric, grader output, development chat,
filesystem, network connector, shell or approval/execution capability is exposed.
The API has no registered native tools; query intents use strict JSON and the
accepted three host read-only tools. Wrong substantive answers remain gradeable.
Actual forbidden-access probes and durable exposure recording are still NOT_RUN.

SIWC requires `store:false`, `stream:true` and full request context. Terminal
completion is required; deltas cannot count as success. Native tool/refusal,
quota, incomplete, interrupted, malformed and missing-usage responses fail
visibly. Reasoning text/encrypted content is discarded; safe counts are retained.
[Preview contract](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).

Structured-output projection converts constants to typed one-value enums, adds
types to enum-only fields and omits wire `maxLength` pending a route probe. The
unchanged accepted host validators enforce every original constraint. Host
validation does not guarantee provider-side generation bounds.
[Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

`callSubscription()` always blocks before credential lookup or network dispatch.
Caller flags cannot accept an amendment or enable a paid fallback. No executable
HTTP transport or scored benchmark is claimed by this preparation. No dependency
was installed or downloaded; helpers use existing Node built-ins.

## Review decision

SIWC cannot enforce the accepted generation/context contract because it omits
`max_output_tokens`. `COMPATIBILITY.md` compares every bound. The separate
`CONTRACT_CHANGE_PROPOSAL.md` proposes an explicitly different measured profile;
it is not applied. `CONTRACT_REVIEW.md` binds its exact hash and remains pending.
Accepting a provider preference does not accept this contract amendment.

Retaining the accepted hard bounds keeps subscription scoring blocked. Accepting
the proposed measured profile would require an additive, governed upstream
amendment and refreshed acceptance/freshness bindings, retaining the accepted
Spec/Data originals. No scoring occurs before that process and account/route
verification. Separate runtime approval and the complete Build gate still apply.

The Stage 03 rule is: "Require accepted/fresh Data and explicit provider/model/spend
conditions." Its human gate says: "A person reviews exact Build/VERIFY hashes."
[Active stage](../../CONTEXT.md). No later stage is advanced.
