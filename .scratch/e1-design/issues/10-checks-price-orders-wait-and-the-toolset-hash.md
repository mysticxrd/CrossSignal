# 10: Checks, `price_orders`, `wait` and the toolset hash

**What to build:** The five checks return numbers, never verdicts; `price_orders` previews rupees; `wait` moves the case clock; one toolset hash covers all 21 tools (Fix F4).

**Blocked by:** 08: Razorpay and dashboard read tools; 09: WooCommerce, GA4, deploy, issue and message tools

**Status:** ready-for-agent

- [ ] A lint fails any output holding a cause name or a word like "anomaly".
- [ ] `wait` never passes the 7 hidden days.
- [ ] The toolset lists exactly 21 tools and its hash changes when any schema changes.
- [ ] `npm test` and `npm run lint` pass.
