# 01: The E1 provider settles with cached tokens

**What to build:** E1 has its own Nebius transport for `deepseek-ai/DeepSeek-V4.1-Flash-1017` with native tool calls. Each send reserves the uncached worst case and settles from a committed price card, counting cached input at the cached rate. Requests are laid out so the cache can hit: system prompt, tools, trigger record, then appended messages, with everything that changes per turn in the newest message. Price cards exist for the agent model, GLM-5.3-Flash and GLM-5.3. A one-time correction command settles the two unsettled 15 Nov sends to the figure the owner reads from Nebius's Usage tab.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Settled cost = (uncached input x input + cached input x cached + output x output) / M from the price card; a unit test covers a response with `cached_tokens`.
- [x] Prefix stability: each send's request body starts with the previous send's request body, byte for byte, across a three-turn fixture.
- [x] The catalog check refuses a model whose prices differ from its price card, before any paid request.
- [x] The correction settles both 15 Nov sends in one logged entry, refuses a send already settled, and refuses an amount above the reservation. (Built and tested; the `--write` run against the real ledger waits on the owner's 15 Nov Usage-tab figure.)
- [x] Reservations still assume nothing is cached.
- [x] `npm test` and `npm run lint` pass.
