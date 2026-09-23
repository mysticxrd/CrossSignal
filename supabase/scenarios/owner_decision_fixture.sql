-- Generated TEST-only Case fixture for the existing authenticated owner workspace.
-- Inserts matching missing rows; never deletes, overwrites, or changes memberships.
begin;

insert into cfr_app.case_recorded_events
  (workspace_id, id, scenario_id, truth_mode, source, window_key, segment,
   observed_day, starts, completed, captures, revenue_cents, content_hash)
values
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-24', 20, 4, 0, 0, '8d1ead9739d1c73c9387eeb68a49d3dccee5978735497069569bd90a7923978a'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-24', 0, 0, 4, 20000, '138ead5ce614a534dea9c1b7f94cf4c899d4ba607b3c493caa94530b1e201bef'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-25', 20, 4, 0, 0, 'adf22f380379f8cdfbcb7ae86c988b4495ef735954fc6793eafe18e26a13ab51'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-25', 0, 0, 4, 20000, '68ed5d310cf9e53bcfbed6e3a8e8ff2b082dad783dd069bb10a1174577ee5cda'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-26', 20, 4, 0, 0, 'ddff263c14842e8bb68a7dc0b7599f07717ae6be671ce2711d6ef03014cdfe53'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-26', 0, 0, 4, 20000, '56f298f76c7ea04c1e93d7e937a3067c6404a8cbd87fafaa4c6dde25cf5790a4'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-27', 20, 4, 0, 0, 'b63bade2c0b54f703a203a34b3ca5ebef278773131521123df2a50a654af3e6a'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-27', 0, 0, 4, 20000, 'bac1025e36f66a84a133979e7da90b8d0a25702d600d75b42ac5020873b31bf1'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-28', 20, 4, 0, 0, '1b233ada0a338cd97eb0089bf3a02bea8769a44d0744ed220d1d1be802773e0d'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-28', 0, 0, 4, 20000, 'e63aae7c7dcf69d249f48ac185cc69205a25ccea023e3c9be5714c83b5fd20ba'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-29', 20, 4, 0, 0, '963196d26e93a898b2fcbf7f9eaa4df8f024182ab32924c11a5a14f213ef8a84'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-29', 0, 0, 4, 20000, '3242bec4e60dbc5df821b9df9cdbc48c7b2dd84c5ecdaacfa4aba3f78520aa70'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-30', 20, 4, 0, 0, '16bafb1cb3daf3900833003e52255702683a7626f05d4b72cc8c40bd900240cb'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'mobile_safari', '2026-07-30', 0, 0, 4, 20000, 'b635b9e6ff065f98d71932bc4e040c5acbd65c324734a592cdb5a2467e648df4'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-24', 20, 4, 0, 0, '27f531d8b9be15f8a4a086340c31d498bbaa61874806690cb43e70f58ca2f8c1'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-24-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-24', 0, 0, 4, 20000, 'a5c048767547ef1ce1eefd13d64e0a937a85a9e2d5dfa8065ab8716ca30666eb'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-25-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-25', 20, 4, 0, 0, '4738822eeb38b5545fed07f6bd24df69712a963c6a355d729eac7157616920e9'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-25-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-25', 0, 0, 4, 20000, '6da94faff3a52223c6cd6326b5e09cd63d3d6a38ca5d9f76e0dff62d4ec53ea4'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-26-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-26', 20, 4, 0, 0, '9334e9ff789649f8633f8e2f569edd3c288b4e0bdd7b0ace7ef19a7a68ed49db'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-26-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-26', 0, 0, 4, 20000, '6a03f5fea46d4dbf8f2bda5707548819269b6a7e0f6c8ee4b031ea4ae80701f1'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-27-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-27', 20, 4, 0, 0, 'c34ed34a7ef7e747b0590b46da8551564ccf10f766f6f4bc8e322c38fab3b1ec'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-27-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-27', 0, 0, 4, 20000, '4bf9a2cc24ba0dc8efc8ee6b9d7e859d0b935ac288ed0950e4a813304eb0536f'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-28-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-28', 20, 4, 0, 0, '0f468564aaf8df53a9846e6a47cfc9b3d6ab452251166a1e197e0c8d5d653b51'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-28-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-28', 0, 0, 4, 20000, 'e0dd64738a89d6274957496db9bc541175ce90314cf360998a5189ae805061c6'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-29-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-29', 20, 4, 0, 0, 'd921ff6398235a7564199e9987bf2f63e4306b131df0cd62ec95c9766a9872ea'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-29-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-29', 0, 0, 4, 20000, '4415604423f53a472484edf3c47055d9051ce0ca5edfa74b67ba64903f5bcf06'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-30-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'baseline', 'desktop', '2026-07-30', 20, 4, 0, 0, '0862d0f698241392ce12c39d83c6f3340df91dc6fc570b1a7902bf998f47a39e'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-30-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'baseline', 'desktop', '2026-07-30', 0, 0, 4, 20000, 'bfdfd2e4ee8121f500325b5bbd0a62f3f7b34433c0c65f46f50bfcf7f8b3f645'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-01', 20, 2, 0, 0, 'a4e5798e9cc960997969c9441425f8090fd9799b7e4e5061e34dfe04d98e18d5'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-01', 0, 0, 2, 10000, 'ffb31adeeaf08f96aee137d309c8c1f6277329355bd0650d265dfb7b0e252546'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-02', 20, 2, 0, 0, '2e26d56190cb7dde3ab30fc460e9407891996c50f44103dbe7ca0d52261d28dc'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-02', 0, 0, 2, 10000, '1d621ecf9a4c96a3e1b013da0a2bc4902bcd971e5b5a3e5b08b59221b2d50989'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-03', 20, 2, 0, 0, '74a76293948d73021c817cd19b1b110874fa45ae5629832fec3f91804add2be2'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-03', 0, 0, 2, 10000, '8dc94a69ca79f80ed08d2fe6ce9b2927ef1a403d04874215273b63ae2967059b'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-04', 20, 2, 0, 0, '900124f1ec6ce1131b03a3dd05420ff512ee9b1b490155b881dbfe4a520c2bc5'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-04', 0, 0, 2, 10000, '748ea3ca2ea0db8482c70c34a89231d9eb77d79982a74c483c5e3f9d05c7ffd6'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-05', 20, 2, 0, 0, '3f87cd7ce65901b94b65bbb2a555c181ebd763ef29bbd6281293c623fde2f8e3'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-05', 0, 0, 2, 10000, 'abeee1d1ad84b4960fb4d9a0c5a6813485270bdca08f5e02d4f487252722c45b'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-06', 20, 1, 0, 0, '445c42ccef5e8e7b3aa6c2432daba5da0145ffb49d8e481a57050504daf89d8d'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-06', 0, 0, 1, 5000, 'a20b6f95acff43221c6a0fe645a99d8605822ad9e087a8bba6c54056d44a26fc'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'mobile_safari', '2026-08-07', 20, 1, 0, 0, 'aedacac5e5f00b8388cdcddc395e2ca4c1d77e621d8713e20a16520552d0b331'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'mobile_safari', '2026-08-07', 0, 0, 1, 5000, '8d24694a3fe66c902ac8ebfc79e576c26efff54b2717369fd2e9eeed1af1079e'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-01-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-01', 20, 4, 0, 0, 'c78fef8766be17a62f74429278e77a5f708aac03074b2098986f701a6019cc05'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-01-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-01', 0, 0, 4, 20000, '8039889274ab9e53205302aacc43a3c6c3facf1d2044e830637160e53f1d19de'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-02-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-02', 20, 4, 0, 0, 'f463bb6c41aab738510d8a9a0d85ce837272f03964d9e2a8ebfdfb79fd276f88'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-02-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-02', 0, 0, 4, 20000, 'dbad037dfd37de7df3cf2ac264090f8612538e5e7a382e0bea7b318a2a1c7415'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-03-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-03', 20, 4, 0, 0, '2114aa3a4ecf8d0ef1dae780584f9e61f39ce5d06650e2aaf4b166d0c594c2d7'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-03-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-03', 0, 0, 4, 20000, '455c5427c9e0d3e990ef0af09806477f393aa56bb991f9ed4b370cdc0b9e844a'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-04-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-04', 20, 4, 0, 0, '0d0e59f5abd5bb335c30226ff6d7c2842ec14107a8c7869a5db4067fb466f669'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-04-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-04', 0, 0, 4, 20000, 'ec5f6d5c6d08614bd3e71433d663d008f21f033845db9835590f4f7b77a60b70'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-05-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-05', 20, 4, 0, 0, '541caef7c57fd424a6a1caf3f1bf072b23338b441e0cd3df479290865ce5455c'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-05-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-05', 0, 0, 4, 20000, 'e52c91d475fae1e1d53ee8f24b6e5ce4c8d32677f42a71f37811e6484f2d82b5'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-06-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-06', 20, 4, 0, 0, '6584816d03f6259de1204d54314d18a2c52f530383cf0dabc9a7002f60261d00'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-06-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-06', 0, 0, 4, 20000, '4cb99d18ca119ef0789d18784abc60e67a6e93c6a3ade4f5a3e1596ae5ce3284'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout', 'golden-mobile-checkout-v1', 'FIXTURE', 'checkout_analytics', 'observed', 'desktop', '2026-08-07', 20, 4, 0, 0, 'fbf67abf6e2498ce014db2d8f0310da3aae13c3d21e683b6a6d3a32d6cc33dc2'),
  ('l14-workspace-a', 'golden-mobile-checkout-v1-observed-desktop-2026-08-07-payment', 'golden-mobile-checkout-v1', 'FIXTURE', 'payment_ledger', 'observed', 'desktop', '2026-08-07', 0, 0, 4, 20000, 'f3860cb315cdf5e07c90b75a208b4d94544e3d964963d373b3c13b4087e4b541')
on conflict do nothing;

insert into cfr_app.detected_cases
  (workspace_id, id, scenario_id, scenario_version, scenario_hash,
   title, status, truth_mode, content_hash, created_at)
values ('l14-workspace-a', 'case-golden-mobile-checkout', 'golden-mobile-checkout-v1',
  1, 'a64ceed227160af35ddd4baf6f88a7d13c0de6ce05e751beeca765aaf016d5dc', 'Mobile Safari checkout revenue leak',
  'detected', 'FIXTURE', 'f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68', '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_signals
  (workspace_id, id, case_id, kind, method_version, detected, metrics_json, content_hash, created_at)
values ('l14-workspace-a', 'signal-golden-mobile-checkout-v1', 'case-golden-mobile-checkout',
  'conversion_drop', 'deterministic-v1', true,
  '{"baseline":{"starts":140,"completed":28,"captures":28,"revenueCents":140000,"conversionBps":2000},"observed":{"starts":140,"completed":12,"captures":12,"revenueCents":60000,"conversionBps":857},"controlBaseline":{"starts":140,"completed":28,"captures":28,"revenueCents":140000,"conversionBps":2000},"controlObserved":{"starts":140,"completed":28,"captures":28,"revenueCents":140000,"conversionBps":2000},"relativeDropBps":5714,"controlRelativeDropBps":0,"expectedRevenueCents":140000,"projectedLeakCents":80000}'::jsonb, 'ed81248cffc39ef935783633e240d4d961080d640e12eb4cb9da4c58a5bb2d09', '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_evidence
  (workspace_id, id, case_id, source, relation, claim, truth_mode, content_hash)
values
  ('l14-workspace-a', 'evidence-mobile-funnel', 'case-golden-mobile-checkout', 'checkout_analytics', 'supports', 'Mobile Safari checkout conversion fell', 'FIXTURE', 'a75f237a27c1ebdc88bf92faed04d78b2114af3eb349212df9af72802d3b8bff'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'case-golden-mobile-checkout', 'payment_ledger', 'supports', 'Captured Mobile Safari revenue fell', 'FIXTURE', '4e9fd7e6bfdb420f5777d0a06a4c84155d9038a411ce6d71270313ced91d892e'),
  ('l14-workspace-a', 'evidence-desktop-control', 'case-golden-mobile-checkout', 'checkout_analytics', 'contradicts', 'Campaign-wide checkout decline', 'FIXTURE', '20d99a038c9ede25fc0ea919dda2a14816d0bdf48af83b5e2de2edc122507c3c')
on conflict do nothing;

insert into cfr_app.case_evidence_event_refs (workspace_id, evidence_id, event_id)
values
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-checkout'),
  ('l14-workspace-a', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-payment'),
  ('l14-workspace-a', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-25-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-26-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-27-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-28-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-29-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-30-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-01-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-02-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-03-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-04-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-05-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-06-checkout'),
  ('l14-workspace-a', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout')
on conflict do nothing;

insert into cfr_app.case_investigations
  (workspace_id, id, case_id, signal_id, method_version, truth_mode, status,
   assessment, source_case_hash, source_signal_hash, artifact_json, content_hash, created_at)
values ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'case-golden-mobile-checkout',
  'signal-golden-mobile-checkout-v1', 'bounded-deterministic-v1', 'FIXTURE',
  'ready_for_review', 'targeted_drop_supported_cause_unconfirmed',
  'f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68', 'ed81248cffc39ef935783633e240d4d961080d640e12eb4cb9da4c58a5bb2d09',
  '{"id":"investigation-case-golden-mobile-checkout","workspaceId":"l14-workspace-a","caseId":"case-golden-mobile-checkout","scenarioId":"golden-mobile-checkout-v1","methodVersion":"bounded-deterministic-v1","truthMode":"FIXTURE","status":"ready_for_review","assessment":"targeted_drop_supported_cause_unconfirmed","sourceCaseHash":"f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68","sourceSignalHash":"ed81248cffc39ef935783633e240d4d961080d640e12eb4cb9da4c58a5bb2d09","summary":"Recorded Mobile Safari conversion and captured revenue fell while desktop remained stable. The cause is unconfirmed.","claims":[{"id":"claim-mobile-conversion","relation":"supports","evidenceId":"evidence-mobile-funnel","finding":"Mobile Safari checkout conversion fell from 20.00% to 8.57% across the recorded windows.","eventIds":["golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout"]},{"id":"claim-mobile-revenue","relation":"supports","evidenceId":"evidence-mobile-payment","finding":"Captured Mobile Safari revenue fell from $1400.00 to $600.00; the baseline-rate projection exceeds observed revenue by $800.00.","eventIds":["golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment"]},{"id":"claim-desktop-control","relation":"contradicts","evidenceId":"evidence-desktop-control","finding":"Desktop checkout conversion stayed at 20.00%, contradicting a campaign-wide checkout decline.","eventIds":["golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-25-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-26-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-27-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-28-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-29-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-30-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-01-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-02-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-03-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-04-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-05-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-06-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout"]}],"limitations":["This is a synthetic FIXTURE incident, not a LIVE revenue loss.","The observed pattern does not identify a root cause or establish causality."]}'::jsonb, 'e308c57c9718eb59c39a7c13bcab63dba29dc527eb8fadd148f379bbb1f4da66', '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_investigation_citations
  (workspace_id, investigation_id, claim_id, evidence_id, event_id)
values
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-conversion', 'evidence-mobile-funnel', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-mobile-revenue', 'evidence-mobile-payment', 'golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-25-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-26-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-27-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-28-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-29-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-baseline-desktop-2026-07-30-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-01-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-02-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-03-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-04-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-05-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-06-checkout'),
  ('l14-workspace-a', 'investigation-case-golden-mobile-checkout', 'claim-desktop-control', 'evidence-desktop-control', 'golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout')
on conflict do nothing;

do $$
begin
  if (select count(*) from cfr_app.case_recorded_events
      where workspace_id = 'l14-workspace-a' and scenario_id = 'golden-mobile-checkout-v1') <> 56
    or (select md5(string_agg(id || ':' || content_hash, '|' order by id))
      from cfr_app.case_recorded_events where workspace_id = 'l14-workspace-a'
        and scenario_id = 'golden-mobile-checkout-v1') <> 'c6a39de38ec0e23f737203c4b9a39e1e'
  then raise exception 'owner Case events differ from source contract'; end if;
  if not exists (select 1 from cfr_app.detected_cases where workspace_id = 'l14-workspace-a'
      and id = 'case-golden-mobile-checkout' and scenario_hash = 'a64ceed227160af35ddd4baf6f88a7d13c0de6ce05e751beeca765aaf016d5dc'
      and content_hash = 'f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68')
    or not exists (select 1 from cfr_app.case_signals where workspace_id = 'l14-workspace-a'
      and id = 'signal-golden-mobile-checkout-v1' and content_hash = 'ed81248cffc39ef935783633e240d4d961080d640e12eb4cb9da4c58a5bb2d09')
  then raise exception 'owner Case or signal differs from detection contract'; end if;
  if (select count(*) from cfr_app.case_evidence where workspace_id = 'l14-workspace-a'
      and case_id = 'case-golden-mobile-checkout') <> 3
    or (select md5(string_agg(id || ':' || content_hash, '|' order by id))
      from cfr_app.case_evidence where workspace_id = 'l14-workspace-a'
        and case_id = 'case-golden-mobile-checkout') <> 'b8120ae88b774660f14873349b32dcdb'
  then raise exception 'owner Case evidence differs from detection contract'; end if;
  if (select count(*) from cfr_app.case_evidence_event_refs r
      join cfr_app.case_evidence e on e.workspace_id = r.workspace_id and e.id = r.evidence_id
      where r.workspace_id = 'l14-workspace-a' and e.case_id = 'case-golden-mobile-checkout') <> 42
    or (select md5(string_agg(r.evidence_id || ':' || r.event_id, '|'
        order by r.evidence_id, r.event_id))
      from cfr_app.case_evidence_event_refs r
      join cfr_app.case_evidence e on e.workspace_id = r.workspace_id and e.id = r.evidence_id
      where r.workspace_id = 'l14-workspace-a' and e.case_id = 'case-golden-mobile-checkout') <> '4103d52f98155dddffd9eadaadcf7da7'
  then raise exception 'owner Case evidence references differ'; end if;
  if not exists (select 1 from cfr_app.case_investigations where workspace_id = 'l14-workspace-a'
      and id = 'investigation-case-golden-mobile-checkout' and artifact_json = '{"id":"investigation-case-golden-mobile-checkout","workspaceId":"l14-workspace-a","caseId":"case-golden-mobile-checkout","scenarioId":"golden-mobile-checkout-v1","methodVersion":"bounded-deterministic-v1","truthMode":"FIXTURE","status":"ready_for_review","assessment":"targeted_drop_supported_cause_unconfirmed","sourceCaseHash":"f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68","sourceSignalHash":"ed81248cffc39ef935783633e240d4d961080d640e12eb4cb9da4c58a5bb2d09","summary":"Recorded Mobile Safari conversion and captured revenue fell while desktop remained stable. The cause is unconfirmed.","claims":[{"id":"claim-mobile-conversion","relation":"supports","evidenceId":"evidence-mobile-funnel","finding":"Mobile Safari checkout conversion fell from 20.00% to 8.57% across the recorded windows.","eventIds":["golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-checkout","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-checkout","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-checkout"]},{"id":"claim-mobile-revenue","relation":"supports","evidenceId":"evidence-mobile-payment","finding":"Captured Mobile Safari revenue fell from $1400.00 to $600.00; the baseline-rate projection exceeds observed revenue by $800.00.","eventIds":["golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-25-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-26-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-27-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-28-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-29-payment","golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-30-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-01-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-02-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-03-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-04-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-05-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-06-payment","golden-mobile-checkout-v1-observed-mobile_safari-2026-08-07-payment"]},{"id":"claim-desktop-control","relation":"contradicts","evidenceId":"evidence-desktop-control","finding":"Desktop checkout conversion stayed at 20.00%, contradicting a campaign-wide checkout decline.","eventIds":["golden-mobile-checkout-v1-baseline-desktop-2026-07-24-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-25-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-26-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-27-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-28-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-29-checkout","golden-mobile-checkout-v1-baseline-desktop-2026-07-30-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-01-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-02-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-03-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-04-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-05-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-06-checkout","golden-mobile-checkout-v1-observed-desktop-2026-08-07-checkout"]}],"limitations":["This is a synthetic FIXTURE incident, not a LIVE revenue loss.","The observed pattern does not identify a root cause or establish causality."]}'::jsonb
      and content_hash = 'e308c57c9718eb59c39a7c13bcab63dba29dc527eb8fadd148f379bbb1f4da66')
  then raise exception 'owner Case investigation differs'; end if;
  if (select count(*) from cfr_app.case_investigation_citations where workspace_id = 'l14-workspace-a'
      and investigation_id = 'investigation-case-golden-mobile-checkout') <> 42
    or (select md5(string_agg(claim_id || ':' || evidence_id || ':' || event_id, '|'
        order by claim_id, evidence_id, event_id)) from cfr_app.case_investigation_citations
      where workspace_id = 'l14-workspace-a'
        and investigation_id = 'investigation-case-golden-mobile-checkout') <> '0492e65ac386c25b28a5c82c44108831'
  then raise exception 'owner Case investigation citations differ'; end if;
end $$;

commit;
