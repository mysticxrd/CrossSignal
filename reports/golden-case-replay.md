# Local golden-Case replay — PASS

Repeatability: two fresh product processes produced identical JSON (SHA-256 `df7eadbdc7569bcb1116087c51c1bd17e19fbf52f3159e4a780ebc14fe4294c2`).

Case: `case-golden-mobile-checkout` in fixture workspace `l14-workspace-a`. Source: offline local fixture.

| Check | Result |
| --- | --- |
| Detection | 56 FIXTURE observations; 28/140 to 12/140 Mobile Safari conversions; 5714 bps relative drop; $800.00 projected fixture gap |
| Citation integrity | 42 evidence references and 42 Investigator references; every displayed claim resolves to recorded event IDs |
| Simulation coverage | verified: 1 capture, 1 decline; capture-only and repeated capture remain `in_progress`; assessment hash `9b34956cc3289f25b6561677c3342900b40113d008dec00f979f5f32c2bef86a` |
| Safe failures | 12 deliberate cases rejected; below-threshold case stayed `no_signal` |
| Boundaries | Trial receipt `a13e5583c0bfa31be8e2a101a3f3ca2ec889bacf7749b605c5e8542070e36e7a` excluded; effective receipt absent; real outcome `awaiting_check`; Case `unresolved` |

## Trace references

- `evidence-mobile-funnel` (supports): 14 recorded IDs; first `golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout`, last `golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout`.
- `evidence-mobile-payment` (supports): 14 recorded IDs; first `golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment`, last `golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment`.
- `evidence-desktop-control` (contradicts): 14 recorded IDs; first `golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout`, last `golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout`.
- `sim_12345678-1234-4123-8123-123456789ab0` (capture, awaiting_runs → in_progress): artifact `5f287e2ab8eee6909e25807c0af6ef5aac16aa19370c68b40b831132094a43ed`; trace `sim_12345678-1234-4123-8123-123456789ab0-started`, `sim_12345678-1234-4123-8123-123456789ab0-capture`, `sim_12345678-1234-4123-8123-123456789ab0-completed`.
- `sim_12345678-1234-4123-8123-123456789ab1` (decline, in_progress → verified): artifact `bc025ac89177670c2f160c6280aac4b7e8cbb91b171b0b53e07e8cf61c83a3ce`; trace `sim_12345678-1234-4123-8123-123456789ab1-started`, `sim_12345678-1234-4123-8123-123456789ab1-capture`, `sim_12345678-1234-4123-8123-123456789ab1-completed`.

## Deliberate failures

- `missing_event`: rejected (recorded event set is incomplete or duplicated).
- `duplicate_event`: rejected (recorded event set is incomplete or duplicated).
- `foreign_event`: rejected (event tenant or scenario mismatch).
- `missing_evidence_citation`: rejected (evidence citation set is incomplete).
- `foreign_snapshot`: rejected (Case scenario, tenant, or truth boundary is invalid).
- `changed_investigation_claim`: rejected (investigation artifact differs from recorded-event derivation).
- `foreign_decision_citation`: rejected (Investigation citations differ).
- `injected_evaluator_answer`: rejected (investigator input has unknown or missing fields).
- `tampered_simulated_trace`: rejected (Synthetic checkout artifact differs).
- `duplicate_simulated_run`: rejected (Synthetic checkout binding differs).
- `live_simulated_artifact`: rejected (Synthetic checkout artifact differs).
- `simulation_as_real_receipt`: rejected (Saved Case check receipt is invalid).

This is a deterministic local replay. SIMULATED checkout coverage is separate from actual Mobile Safari device verification and measured business outcomes. No payment, model, database, or LIVE operation ran.
