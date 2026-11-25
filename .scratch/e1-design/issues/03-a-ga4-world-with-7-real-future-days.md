# 03: A GA4 world with 7 real future days

**What to build:** Code builds the baseline world from the committed GA4 CSV, 2 Nov to 13 Dec 2020 shifted into 2026: hourly orders and payments following GA4 daily revenue in INR, Razorpay and WooCommerce ids, the catalog and the merchant's sale calendar. Every possible "now" has 7 real GA4 days after it (Fix F7).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Daily store revenue follows GA4's daily revenue.
- [ ] The same world version and seed give the same world hash.
- [ ] Every hour that can become "now" has at least 7 GA4 days after it.
- [ ] Ids are sequential in time order (WooCommerce) and hash-derived (Razorpay).
- [ ] `npm test` and `npm run lint` pass.
