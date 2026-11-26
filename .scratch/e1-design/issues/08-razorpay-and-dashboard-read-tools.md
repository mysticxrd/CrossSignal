# 08: Razorpay and dashboard read tools

**What to build:** `fetch_all_payments`, `fetch_payment`, `fetch_order_payments`, `fetch_all_refunds`, `webhook_deliveries` and `capture_settings` answer in documented shapes inside the result envelope, with cursors and the 1.5k-token cap.

**Blocked by:** 07: A simulator that remembers landed writes

**Status:** ready-for-agent

- [ ] Shapes match the doc fixtures.
- [ ] Pagination returns every record once.
- [ ] The leak scanner passes on every response.
- [ ] `npm test` and `npm run lint` pass.
