---
type: release-manifest
stage: 05_ship
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: passed
verified_at: 2026-09-08T06:43:47Z
truth_mode: FIXTURE
release_id: l14-trace-resolution-v1
---

# L14 evaluator-ready release manifest

## Release decision

CrossSignal L14 is packaged as one authenticated, tenant-scoped, redacted,
ordered, read-only trace-resolution endpoint:

```text
GET /api/workspaces/{workspaceId}/traces/{traceId}
```

The release is ready for a cold human review. Its durable success proof is local
`FIXTURE` evidence through the real request handler, tenant-bound D1 resolver,
migrated in-memory database, and L04 projector. The production HTTP probes prove
authentication-first loading, request validation, cache behavior, and masked
dependency failure. This is not a deployed or live D1 claim.

## Evaluator evidence capsule

| Promise | Bound evidence |
|---|---|
| Strict authentication | The route authenticates before dynamically loading the Cloudflare-backed resolver; unauthenticated local production HTTP returns exact no-store JSON HTTP `401`. |
| Pre-lookup validation | An authenticated field-selection query returns exact no-store JSON HTTP `400`. |
| Tenant scope | Owner membership binds authenticated user and workspace; trace and event reads bind workspace and trace. |
| Complete ordered projection | The real L04 projector returns the accepted 28-event pending history and 49-event completed history in contiguous order. |
| Redaction and secrecy | Only the accepted trace/event keys project; unknown secret-bearing payload fields produce empty details. |
| Non-disclosure | Unauthorized, cross-tenant, cross-trace, and absent resources share byte-identical `404` bytes. |
| Integrity | All five malformed histories fail closed as event-free `409`. |
| Dependency masking | A valid authenticated local production request without D1 returns exact no-store JSON HTTP `500` without internal detail. |
| Read-only behavior | Repeated success and failure reads preserve trace, event, intent, grant, and effect counts. |
| Cold reproducibility | `factory/05_ship/output/DEMO_SCRIPT.md` starts from the checkout and requires no hidden repair. |

## Accepted coverage

All Stage 04 outcomes are passed and accepted.

Acceptance IDs:

`AC-L14-01`, `AC-L14-02`, `AC-L14-03`, `AC-L14-04`, `AC-L14-05`, `AC-L14-06`, `AC-L14-07`, `AC-L14-08`, `AC-L14-09`, `AC-L14-10`, `AC-L14-11`, `AC-L14-12`, `AC-L14-13`, `AC-L14-14`

Negative IDs:

`NEG-L14-01`, `NEG-L14-02`, `NEG-L14-03`, `NEG-L14-04`, `NEG-L14-05`, `NEG-L14-06`, `NEG-L14-07`, `NEG-L14-08`, `NEG-L14-09`, `NEG-L14-10`, `NEG-L14-11`, `NEG-L14-12`

The executable evidence is 57 focused tests: two L14 success histories, five
projector corruptions, stable `400`/`401`/`404`/`409`/`500` envelopes,
tenant isolation, unknown-event redaction, secret suppression, and repeated-read
invariance.

## Shipped surface

- `app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts`: dynamic GET
  route with strict authentication and lazy resolver loading.
- `app/trace-resolution.ts`: request validation and stable no-store response
  contract.
- `db/trace-resolution.ts`: owner membership plus workspace-and-trace-bound
  read-only resolution through the L04 projector.
- `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs`: accepted
  `FIXTURE` contract for success, error, corruption, isolation, secrecy, and
  read-only cases.
- `tests/flight-recorder-build.test.mjs`: executable handler, resolver, route,
  projection, and negative proof.
- `factory/04_verify/output/VERIFICATION_REPORT.md`: accepted full-story
  verification.
- `factory/05_ship/output/DEMO_SCRIPT.md`: cold evaluator path.

## Cold review

Run `npm run demo:prepare`, then follow
`factory/05_ship/output/DEMO_SCRIPT.md`. The expected production boundary is
HTTP `401` without identity, HTTP `400` for authenticated query selection,
and masked HTTP `500` for an authenticated valid request when local D1 is
absent. The 28-event pending and 49-event completed successful responses are
proven by the labeled in-memory fixture path, not claimed from that no-D1 server.

## Truth and limits

- Truth mode is `FIXTURE` for durable success histories and local runtime for
  HTTP route loading/error-envelope probes.
- No deployed endpoint, live tenant data, live D1 binding, external integration,
  UI flow, exactly-once delivery, or causal claim is made.
- No environment secret value is required or recorded.
- Stage 05 changes release evidence only; durable product code is unchanged.
- Commit and `factory/seal.mjs` are intentionally deferred until this stage's
  human gate is accepted.

## Release-head coverage

The table below binds all 115 existing Git-tracked and untracked
non-ignored release files, excluding `_archive/`, dependency directories,
generated build output, and `factory/05_ship/output/`. Stage 05 output files
are separately hash-bound by `output/HUMAN_GATE.md`, avoiding self-reference.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `../../../.gitattributes` | `95990bcc46ebd855393090abf83dd7e8e1c63b0b07630f1e31131a70cd5a1e22` |
| `../../../.gitignore` | `0ca90faf73973374e38f6292defb0aa54ad15fc5bac552be25365a7fcd127f90` |
| `../../../.openai/hosting.json` | `438a425870b6a5c247e44231b0ecc3bc8e651c97d8fd6ca1863478825e58dfba` |
| `AGENTS.md` | `222241ef15f8d1c00690811492d6a23f842bfc7067924c805e9214968d7e3caf` |
| `app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts` | `418b13ecc92d5c5e7a075bab06e33b8195aea3205ebeacac66008cd53734d7e3` |
| `app/case-actions.ts` | `9fb4a61452a1e60aa2e2eb80b79463d8c2cca4d6212918b166d7c2b2e3c1ea76` |
| `app/case-types.ts` | `7ef995a5dd97a4c611c332f261dcebccf021fbaf753ab9e40210163bc34d5e63` |
| `app/chatgpt-auth.ts` | `4265a2e7c2dcb3a6f4b7026f762bf5b6e4caec76cc13c0a45987ee9a9f2e42cc` |
| `app/crosssignal-auth.ts` | `c6ab098131230d21491af33be98430ff9a12af081166a8c30bc6ff2b3bef7d7a` |
| `app/CrossSignalApp.tsx` | `29cd9f0b0bb9b42074b0ffe51c113d8e626c2077ef6a0b88991011104b1ecacb` |
| `app/error.tsx` | `a5183b7e64a799e739597b593588e386b54aadf8d43c809e022d111c5fac84f9` |
| `app/flight-recorder-actions.ts` | `3823f5b3487147b4a9a3f9c691cefed1fb93206527a81e1b229606899fc085c3` |
| `app/flight-recorder-types.ts` | `69f588d2bc6f7584e66725026ff9fe247a7e7aed7de1ae074fc4ecbca062e7ea` |
| `app/globals.css` | `0d54ef5f5edd8056d6a8a68b974832f52e191fad5d69906eb9b0b40ee58d68f0` |
| `app/layout.tsx` | `e46ce6f6da8ce2265d01d2aff836b21a72aeaa1b182eb5fbf03f3734f5e973b8` |
| `app/page.tsx` | `b72866126a09ffa1e0f51e127564b22b56430d16ea5d5c4f7878822c55624722` |
| `app/trace-resolution.ts` | `256b25f5350fe4c383f949dff9c6a2cdce7265626fbba62d1ee7439382f082fd` |
| `app/workspace-actions.ts` | `0b4a3138b3276ca879f23a2946f26cf7cbde7626c330a0f5d3a3b705b1ce89a1` |
| `app/workspace-config.ts` | `b5bfefbdb1f688b4b94f621275287ab8bcc449f429f3f793adbbc0db50d7a6b1` |
| `app/workspace-selection.mjs` | `722c646524203093616f7492960750785e2ff991e3264a44159acaa7379305f9` |
| `app/workspace-types.ts` | `5e0859bb8aff3cab90787fd54d22e1a721c09e0056141fd8a4b9cca464d09c09` |
| `app/WorkspaceOnboarding.tsx` | `353d38e00b9ec5819005caca2cb72cac90efdf41c127b9fc1e478169ea604cb4` |
| `build/sites-vite-plugin.ts` | `81b7cbfaeb970611572256aba0e313425beb3809f6426f63750696c15d9c756b` |
| `CONTEXT.md` | `ec8bb40c23aaee9503aad623615a7186461cf38b0a3de19549a2c0dc4922a5cb` |
| `db/cases.ts` | `7fb3b07ec747941aa0850aedfcf772e322726d2346edebdc174f65e0ceefe051` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph-definition.ts` | `31c0e55b72d2e4712b94c77e4e7cbd7b7d92638f9e0178979d16e952e4d30b39` |
| `db/flight-recorder-graph.ts` | `e63e9473deeb3cc5491ae7413c5ef49235ce6ee8ab9bcddaeafd8deda15322dd` |
| `db/flight-recorder-schema.ts` | `18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09` |
| `db/flight-recorder.ts` | `4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0` |
| `db/index.ts` | `c6fc9494d04c9457fc4178bed614d0e4ba7c5877e9d65ced11c691b735ec851e` |
| `db/migrations.ts` | `a33c9d1a2435c4a93b1f8f9a779d99084e4903aca6c326d7f308667d285a53b1` |
| `db/schema.ts` | `a9b641b3d901dd496a2cbecb8ce0527d085a5348d0a935d4424b2dde92cc1496` |
| `db/trace-resolution.ts` | `2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9` |
| `db/workspaces.ts` | `d7f5b0d47fd294f2055c8f9247d9b8f5a0a7a1eb9c86e2daf5cb9d917e1a8eb6` |
| `drizzle.config.ts` | `3ec3fe6a06a9be54bbd980ec2fc72b014bfdc7d30b5c92d02aa0aa3c95e39b1a` |
| `drizzle/0000_dry_chat.sql` | `0a26d8021928c8ddd1994f9827968ed816545f754aa54e8bdd70edb0aba69bbe` |
| `drizzle/0001_gigantic_shriek.sql` | `54a8a01177c3f4a7b13759f0e38b56b0d977a55e12053c9498dbafb7b59739d1` |
| `drizzle/0002_funny_madripoor.sql` | `0e7520e7ce1a1522ccadbe45b420f76508405b663bc3cdee27e1d19fd0e16a86` |
| `drizzle/0003_faithful_guardsmen.sql` | `997e637e1194cc7fd95ca8f9ebfa47e628aaa0f7ea4fe41283564bc6f8329ae9` |
| `drizzle/0004_typical_omega_red.sql` | `7faff14fddee736cf378e9010f4a1c113f20049f4d9714caf676f6296cf792b4` |
| `drizzle/0005_flight_recorder_guards.sql` | `17f5a4ffb041d4a3851c9ff441fe61a44274d687c1cbc917356bd247fe6094a7` |
| `drizzle/0006_l08_active_intent_authority.sql` | `a97ce8f9b2a6b595197981742f80b1c4089cf05d57834921b3855fa5d2f844c5` |
| `drizzle/0007_l06_persisted_graph_executor.sql` | `4649dc761eb877d4fc708bd6e8928e04375ccc1021486024b893eb62bec1cf1c` |
| `drizzle/0008_l04_authority_history_trace_projection.sql` | `afcda8bfbf26136c9e46b10f5e051639967c539e4087897a428d86be88389973` |
| `drizzle/meta/_journal.json` | `d671f5d25a21f2533ea2fdec2298dc610ae40d90bdab51c269a1175d74c0b422` |
| `drizzle/meta/0000_snapshot.json` | `bc1585ce65ed36d137bdb7ea203609cda54dacc9e14bbcbb5b3151cc436bfe13` |
| `drizzle/meta/0001_snapshot.json` | `36db1836f8abfa2d425bec076c587919ad5e242f5445af1d06b92262aa977d7e` |
| `drizzle/meta/0002_snapshot.json` | `c8de11e95b55fb2aea8b4a10fcf84e67c328f91169e13da2f0d4ece42c668ab9` |
| `drizzle/meta/0003_snapshot.json` | `5d7b9063673974c423c556592c01667de29dca3a8ebd0c9c1a91eabec337dbf6` |
| `drizzle/meta/0004_snapshot.json` | `54b7d447ed036244393ac2b65cd020865b7a50a862ee0d7d8fc6e5d45b5c950e` |
| `drizzle/meta/0005_snapshot.json` | `3c4dc79f1dc972a2b3f497e87138baee7265f7063daa079d06c7af05c29baded` |
| `drizzle/meta/0006_snapshot.json` | `ed1b70151519da162b465f3bc4c82de3a296b9b32d53855a001c1287d63c0bee` |
| `drizzle/meta/0007_snapshot.json` | `28d211019b32ddbd8ef3316b0a16e1a7163ce1bcff7ecb09c6e6419ea5f12eae` |
| `drizzle/meta/0008_snapshot.json` | `f64ece2bd27b3dcf2f2b216d2443118c97fbf3dad7dbd36cec990331d1bd4221` |
| `eslint.config.mjs` | `6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83` |
| `examples/d1/app/api/notes/route.ts` | `a3d4a74fd53b7bf53e2df41f169d9d9d44a8b22aeb6d92f4e754956079af8909` |
| `examples/d1/db/schema.ts` | `d89eabd95716ce404f5f7ca2a254220435be8ddce7c899d7ef461ff22ec80454` |
| `factory/_lib/CONTEXT.md` | `e435006786a8068efe031bb3a160c0fd8ea02acbd2d8c43d6e2874c95567478b` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/_lib/factory-tools.test.mjs` | `a200bbe88cfa199f7bf0b4f7314bb200a6f232c75433791c8d51b96b370764c1` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_templates/stage/CONTEXT.md` | `4acc6b033afee6220b7fc0bb5c640d383b199911853df36ddc26f925e51c1736` |
| `factory/01_spec/CONTEXT.md` | `ec2c145a85802c01ad5796e9619c72e700ea19350397f58b1379a12fc9f5a47e` |
| `factory/01_spec/output/HUMAN_GATE.md` | `656fc931fe34749c2b1e3db29e6d15e80a0abae1c016d6047679ce410a45a584` |
| `factory/01_spec/output/SPEC.md` | `b09aafe97ecfdd4e6c3085426275b7505c906766023f374e2d7d68f2e2202371` |
| `factory/01_spec/output/VERIFY.md` | `780c09d4a94cf68fd2906f1d3c8447ded38e8eb339c92b7af57cdbdee3acc24b` |
| `factory/01_spec/verify.mjs` | `0def8579dd26156dc5f78ddaa01a90e221a84a8f47e2879386ca42a5c25a4252` |
| `factory/02_data/CONTEXT.md` | `592edb4458d1eff71887ace8f33e240229dd31f66db28c7f54d9b3c5af4dadb7` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |
| `factory/02_data/output/DATA_PACKAGE.md` | `a63729a4927b0b2688f0ce0e15f005cc62e013de97b79cdf8759aa6a078b6cb0` |
| `factory/02_data/output/HUMAN_GATE.md` | `631d4a43b0579408da75aa162a6b5039796c4aa8f99bdc537701f7ec21197d83` |
| `factory/02_data/output/VERIFY.md` | `3938b14873f5e85b1486a736f095f677eb267ab1268eb34679726d75db26382f` |
| `factory/02_data/verify.mjs` | `5729372ae6041ac66da09a51556d6c56b2963852221af3183753aef91ab0da5a` |
| `factory/03_build/CONTEXT.md` | `45fd8c59bf4c8b30fb5adb467a6cbd8bd565f151286dbea43994750f12f68658` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `19da3d7be1858a6d1b56f62be420a683e2a9e54fb85feef8697902c013f13c1b` |
| `factory/03_build/output/HUMAN_GATE.md` | `0de4131a5aa6fe2f35d706077f7d3407b42d7f0ced98aede56584a4e03f078fa` |
| `factory/03_build/output/VERIFY.md` | `d225d5f47c5e6e0f44af8249f042fdbc04e37e3f2c5a8253c1ce1e63035e2814` |
| `factory/03_build/verify.mjs` | `e9e74b541c3d9e8aa8b4b3be5b4c7c380a34c5c5b6cd3f41ee67c5e92c7116b3` |
| `factory/04_verify/CONTEXT.md` | `dde59637a7da7ce046dbe867b6ebbe7c399d42c7e1ee56f173ac061daf369eb6` |
| `factory/04_verify/output/HUMAN_GATE.md` | `c3e0ef560d74a0501e9ed0576793f80fcb03132519362fda93a76817ce546aef` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `1db772fa55840bdb8d5dab2daa26da1ca8e21ea1d91d0153b19415b34b950400` |
| `factory/04_verify/output/VERIFY.md` | `94db8f7c43efa6c0fbe710410c17c2393179486a8419d87794d0d564116e08c3` |
| `factory/04_verify/verify.mjs` | `49358bdfd13d7c102ecd7cd8f1a0467f839aefde04dfee9d1ac9dc3ef3641b5d` |
| `factory/05_ship/CONTEXT.md` | `02d9af49229f2c6565180623b84f5feafcffc7733b83b870dd1725ca6e28a394` |
| `factory/05_ship/prepare.mjs` | `ffb2920821f3203046ce2b1d7f8a894e7b9192153520ec74dea45b6dbe2a391b` |
| `factory/05_ship/verify.mjs` | `4d7a6f8832dd1f7a1bbc49716f34048a2018f3acdcd7813d3de984e3ac3d2cac` |
| `factory/CONTEXT.md` | `56d2af531b40bf5814e7888e68ba6acfd11a310790902f1be5dbbb1a23e4bf64` |
| `factory/seal.mjs` | `3677085ff09b983e03dd69b7b27d060eca32fa155464f7df3de3dad11bafb65e` |
| `factory/status.mjs` | `a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5` |
| `next-env.d.ts` | `a291a6b60536fec0a3b9d4ffd6d51179b463e9bc20281d7499d756813b4c07d5` |
| `next.config.ts` | `614bce25b089c3f19b1e17a6346c74b858034040154c6621e7d35303004767cc` |
| `package-lock.json` | `86d8480136f787a56fe5c47602dbb2db0af497d0daaa237178b707be5229f6aa` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `postcss.config.mjs` | `dfac7ac2d86d326a0e5adb024e7943c181393ed17a5fcb8f0315b24c7da6ddde` |
| `public/favicon.svg` | `3e8863288c2d43dd33d2a71de317dcf9198f09932ea8d61e0def1b846a865435` |
| `public/file.svg` | `81a9ce5ca9bc60870c1d72c0fd5b98b2bc5c8c02b0e04fefeab9efcc11277228` |
| `public/globe.svg` | `13187c071b4d369df3a7a179f69a927165bf624e1a524ee6c93b7d3be75d6fc8` |
| `public/og.png` | `82ab800d9e92b3b0ae9d5117d1218862683d2f42bdd6600ab3cb4cfd94e047ab` |
| `public/window.svg` | `d3cd4bf0c1123258fcc266409856e28c93d4fc1cf8476702225e17842900ca63` |
| `README.md` | `7e140c6ebeb75777e9302af506d710ff74444633b5fa2744f61553ec959bf192` |
| `tests/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |
| `tests/fixtures/persisted-graph-executor.fixture.mjs` | `3c9f911d80704616ef926aff69e85334514ebf620021553845da738f4e2580f9` |
| `tests/flight-recorder-build.test.mjs` | `6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b` |
| `tests/flight-recorder-data.test.mjs` | `d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf` |
| `tests/flight-recorder-release.test.mjs` | `4e406531692b62dfd506099e92107b05935bc191ac2795bb036de956b76b26d8` |
| `tests/flight-recorder-ship.test.mjs` | `9c500880b1237f28cdfeb3efd8f5b67d4db2644b951b9db709d42a1a48db2a11` |
| `tests/icm-workspace.test.mjs` | `549c1f9dd55c864a1bdb745ebae4b2fdfa168258a4fa9d29b7b06a68a05ba312` |
| `tests/rendered-html.test.mjs` | `8b50e86d53ec73fe4b93bbdbea945f36fe7ba2a8c46a537bc82329c8acae7598` |
| `tsconfig.json` | `379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147` |
| `vite.config.ts` | `4a8de6242dc5eecaf99f582ec511cd4f6ee367648b38d5599c90f462cdc89fd0` |
| `worker/index.ts` | `2ed36d7fa996e946d9d7695c5925e7760246f6bf8fa35c06f1bc515c087dc450` |
