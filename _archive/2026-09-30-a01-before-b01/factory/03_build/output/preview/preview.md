# Simulated checkout investigation — awaiting your approval

Indian debit-card checkout fell from 95% to 60%; controls stayed at 95%. The deterministic baseline found a matching checkout change and validation errors, then checked provider health and support evidence.

## Proposed intervention

Rollback **checkout v142 → v141** in the local simulator. One execution, zero cost, no external write. Observe two new simulated windows afterward.

No rollback has been approved or executed. This is a scripted baseline, not evidence of AI investigation quality or recovered business revenue.

## Competing explanations

- **checkout_validation_regression**: supported. Evidence: ev-7413fef871a6db01ba031708, ev-8d12cf85d45f28a71c66db1f, ev-44cb140e28dc0e81c4cc0cc2
- **payment_provider_incident**: disfavored. Evidence: ev-ec5203813e230b0e6e86802d
- **acquisition_mix_change**: disfavored. Evidence: ev-010c3eb21bed3cd2505a5b24, ev-6ecb67728207c08f2c72f776, ev-127625691f34387060beab11, ev-e93e1e9266737a8a7bf7423d, ev-190aa3d3f0069aad832efcae, ev-e692b146ab5825b715b79ad2, ev-94d1ef8fa9afdf8f18171bcc, ev-9e51b61979a229b64ec4a597, ev-260945ac1e8aa05081430679, ev-f14ffbd29ffdcd1d19f65813, ev-673c169e04d36b0963594125, ev-923bd17173e2904994418fd0

Provider contradiction check: Provider health weakens provider outage and supports checkout ranking.

[Exact proposal](proposal.json) · [Saved Case timeline](artifact.json)

## Approve this exact proposal

Approval binds payload hash `b7833612b6a770502b1604efc4ce65079329062203f7791c63fa4b984d51675f`. To approve the displayed simulated intervention, run:

```powershell
node --experimental-strip-types scripts/a01-case.mjs approve "C:\Users\hisha\ChatGPT\CrossSignal\work\crosssignal-phase1\outputs\a01\case-osnHSe" b7833612b6a770502b1604efc4ce65079329062203f7791c63fa4b984d51675f
```

Use the inspect command to reopen this Case without execution. Data/Build stage acceptance is separate from this runtime approval.
