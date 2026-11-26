# 05d: Customer messages

**Slice of:** 05: Payment causes: #670, late authorization, webhook, messages, decoys

**What to build:** `world.messages`: background messages (about 3 a day) and cause messages (about 1 in 4 affected customers writes), from a bank per cause family written from public symptom descriptions, English and Hinglish, some vague. Each record is `{ id, created_at, email, phone, text, order_ref }`, at most 280 characters, `order_ref` only when the customer typed one, sorted by `created_at`, then `id`. Ticket 09 serves them through `list_messages`.

**Blocked by:** 05a: A case injects #670 and passes the counterfactual check

**Status:** ready-for-agent

- [ ] Messages come from the case seed and the world hash covers them.
- [ ] About 1 in 4 affected customers writes; background messages are present in every case.
- [ ] No message is copied from a real customer.
- [ ] `npm test`, `npm run lint` and `npm run typecheck` pass.
