# 11: `propose`: schema, kind of action, rupees

**What to build:** `propose` takes cause, evidence, up to 6 effects, asks and side findings in a strict schema. Code derives the kind of action and prices the rupees from the effects' targets.

**Blocked by:** 10: Checks, `price_orders`, `wait` and the toolset hash

**Status:** ready-for-agent

- [ ] A set matching no kind is "mixed" and fails.
- [ ] The pricing formula matches the answer key's pricing.
- [ ] Asks never also target an order.
- [ ] `npm test` and `npm run lint` pass.
