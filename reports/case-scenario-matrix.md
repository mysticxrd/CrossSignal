# Local Case scenario matrix — PASS

Repeatability: two fresh product processes produced identical JSON (SHA-256 `e71100cd69caa4cfb02a2b8e912b3871e73e453f38081ab5897eafbcca6d1c2e`).

Designed variants: 7 valid counterfactuals, 6 invalid inputs. The valid set has 2 detected and 5 no-signal results.

| Variant | Signal | Mobile drop (bps) | Control drop (bps) | Mobile starts | Projected fixture gap |
| --- | --- | ---: | ---: | ---: | ---: |
| `golden` | detected | 5714 | 0 | 140 | $800.00 |
| `moderate_mobile_drop` | no_signal | 2500 | 0 | 140 | $350.00 |
| `broad_checkout_drop` | no_signal | 5714 | 7500 | 140 | $800.00 |
| `low_mobile_volume` | no_signal | 5714 | 0 | 70 | $800.00 |
| `revenue_offset` | no_signal | 5714 | 0 | 140 | $0.00 |
| `severe_mobile_drop` | detected | 7500 | 0 | 140 | $1050.00 |
| `no_mobile_drop` | no_signal | 0 | 0 | 140 | $0.00 |

## Trace references

- `golden` input hash: `ff41f5c25adb6fae849930ef995476f7a10c55b084acc8e633d4fa1c78c0fe16`.
- `golden/evidence-mobile-funnel`: 14 source-bound event IDs; first `golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout`, last `golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout`.
- `golden/evidence-mobile-payment`: 14 source-bound event IDs; first `golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment`, last `golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment`.
- `golden/evidence-desktop-control`: 14 source-bound event IDs; first `golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout`, last `golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout`.
- `severe_mobile_drop` input hash: `5048241546562acd0497a8c89eea771f253137ddd013a392baf28a76147e1c4e`.
- `severe_mobile_drop/evidence-mobile-funnel`: 14 source-bound event IDs; first `golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout`, last `golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout`.
- `severe_mobile_drop/evidence-mobile-payment`: 14 source-bound event IDs; first `golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment`, last `golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment`.
- `severe_mobile_drop/evidence-desktop-control`: 14 source-bound event IDs; first `golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout`, last `golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout`.

## Rejected inputs

- `missing_observation`: recorded event set is incomplete or duplicated.
- `duplicate_observation`: recorded event set is incomplete or duplicated.
- `foreign_workspace`: event tenant or scenario mismatch.
- `ledger_mismatch`: checkout and payment counts differ on 2026-07-24/mobile_safari.
- `live_scenario`: scenario version or truth mode is invalid.
- `evaluator_injection`: scenario has unknown or missing fields.

These are deliberately designed FIXTURE counterfactuals, not an estimate of field accuracy. No model, payment provider, database, device, TEST deployment, or LIVE operation ran. No Case was closed or business outcome measured.
