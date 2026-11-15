# 01: Order recovery sends to DeepSeek only

**What to build:** `node scripts/run-order-model.mjs` prepares, records and
sends order-recovery requests for DeepSeek on Nebius only. `--provider`
defaults to `nebius`; `gemini` is refused. The finished token-limit study
harness is removed and its two reports stay as labelled records.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `order-recovery/` has no Gemini wire format, pacing or attestation check.
- [x] `gemini` as a provider fails with `unknown_order_model_provider`; a command without `--provider` prepares the Nebius request.
- [x] The Nebius live tests pass unchanged in behaviour; the #664 and higher-cap tests move out of the deleted study test.
- [x] `reports/order-recovery/model-comparison.md` and `token-limit-study.md` name the commit and batch that produced them.
- [x] AGENTS.md "Order recovery" no longer says no model is called.
- [x] `npm test` and `npm run lint` pass.
