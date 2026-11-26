# 08: Razorpay and dashboard read tools

**What to build:** `fetch_all_payments`, `fetch_payment`, `fetch_order_payments`, `fetch_all_refunds`, `webhook_deliveries` and `capture_settings` answer in documented shapes inside the result envelope, with cursors and the 1.5k-token cap.

**Blocked by:** 07: A simulator that remembers landed writes

**Status:** done

- [x] Shapes match the doc fixtures.
- [x] Pagination returns every record once.
- [x] The leak scanner passes on every response.
- [x] `npm test` and `npm run lint` pass.
