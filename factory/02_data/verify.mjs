import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileHash, pathHash, frontmatterValue, markdownHashBindings, markdownSection, runChecked } from '../_lib/verify-kit.mjs';
import { deriveFactoryState } from '../_lib/factory-state.mjs';
import { verifySpec } from '../01_spec/verify.mjs';
import { canonical, digest } from './benchmark/contracts.mjs';
import { generatedPackage } from './benchmark/generate.mjs';
import { runContractChecks } from './benchmark/contract-checks.mjs';
import { checkImmutableHistory } from './benchmark/preservation.mjs';

const stage = dirname(fileURLToPath(import.meta.url)), root = resolve(stage, '../..'), output = resolve(stage, 'output');
export const inputPaths = Object.freeze([
  'factory/01_spec/output/SPEC.md', 'factory/01_spec/output/HUMAN_GATE.md', 'factory/01_spec/output/VERIFY.md',
  'factory/_shared/BENCHMARK_DIRECTION.md', 'factory/_shared/QUALITY_GATES.md', 'factory/02_data/CONTEXT.md',
  'tests/evaluator/benchmark/expected-judgments.md', 'db/a01/contracts.mjs', 'db/a01/tools.mjs', 'db/a01/isolated.mjs', 'db/a01/store.sql', 'tests/a01.test.mjs',
  'factory/_lib/verify-kit.mjs', 'factory/_lib/factory-state.mjs', 'factory/01_spec/verify.mjs', 'factory/status.mjs',
  'package.json', 'package-lock.json', 'eslint.config.mjs',
  'factory/02_data/verify.mjs', 'factory/02_data/benchmark', 'factory/02_data/output/CONTRACT_EVIDENCE.json',
]);
const immutable = name => name.startsWith('factory/02_data/') || name.startsWith('factory/_shared/') || name.startsWith('factory/01_spec/output/');
export function validateDataPackage(text) {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  require(frontmatterValue(text, 'unit') === 'b01-api-behavioral-benchmark', 'wrong unit');
  require(frontmatterValue(text, 'version') === 'benchmark-data-package-v1', 'wrong package version');
  require(frontmatterValue(text, 'model_evaluation') === 'NOT_RUN', 'Data cannot claim model evaluation');
  require(frontmatterValue(text, 'human_runtime_approval') === 'NOT_RUN', 'Data cannot claim runtime approval');
  require(frontmatterValue(text, 'paid_api_authorization') === 'not-granted', 'Data cannot grant API budget');
  for (const heading of ['Accepted upstream and scope', 'Frozen cases and cutoff', 'Schemas and identity', 'Evidence and exposure',
    'Frozen judgments and split', 'Store and version adapter', 'Checks and limits', 'Human review and handoff', 'Declared input hashes']) {
    require(text.includes(`## ${heading}\n`), `missing ${heading}`);
  }
  const cases = [...text.matchAll(/^\| (B0[1-5]) \|/gm)].map(m => m[1]);
  require(cases.join(',') === 'B01,B02,B03,B04,B05', 'must freeze exactly five cases');
  require(text.includes('two distinct private worlds') && text.includes('identical observable cutoff'), 'missing underidentification proof');
  require(text.includes('13 executable checks') && text.includes('15 actual file-read denials'), 'missing deterministic boundary evidence');
  require(text.includes('byte-fallback') && text.includes('provider-specific tokenizer'), 'context fit must state its condition');
  require(text.includes('Method-blinded human') && text.includes('50 planned artifacts'), 'missing semantic review contract');
  require(text.includes('human gate is pending') && text.includes('No Build work'), 'missing stopping boundary');
  return errors;
}
function negativePackageChecks(text) {
  const changes = [
    ['model performance claim', value => value.replace('model_evaluation: NOT_RUN', 'model_evaluation: PASSED')],
    ['runtime approval claim', value => value.replace('human_runtime_approval: NOT_RUN', 'human_runtime_approval: PASSED')],
    ['budget claim', value => value.replace('paid_api_authorization: not-granted', 'paid_api_authorization: granted')],
    ['missing case', value => value.replace(/^\| B05 \|.*\n/m, '')],
    ['hidden cause substituted for epistemic proof', value => value.replace('two distinct private worlds', 'one hidden cause')],
    ['missing human review', value => value.replace('Method-blinded human', 'Investigator self-grading')],
    ['unqualified context claim', value => value.replaceAll('byte-fallback', 'unspecified')],
  ];
  for (const [name, mutate] of changes) assert(validateDataPackage(mutate(text)).length > 0, `package did not reject ${name}`);
  return changes.map(([name]) => name);
}
async function requireUpstream() {
  const upstream = await verifySpec();
  assert.equal(upstream.gate, 'accepted');
  const state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.equal(state.stages[0].status, 'complete'); assert.equal(state.stages[0].dependencies, 'fresh');
  return upstream;
}
async function bindings() {
  return Promise.all(inputPaths.map(async path => `| \`${path}\` | \`${await pathHash(root, resolve(root, path))}\` |`));
}
function packageBody(result, hashes) {
  const p = generatedPackage(), fit = result.checks.find(c => c.name === 'lossless-allowlisted-exposure-and-conservative-context-fit');
  const singleMax = Math.max(...fit.sizes.map(c => c.singleShotInputBytes));
  return `---
type: data-package
unit: b01-api-behavioral-benchmark
version: benchmark-data-package-v1
status: prepared-for-human-review
truth_mode: SIMULATED
baseline_commit: 43d42d255bd22cb227e3410dda31ffb8437f6624
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
paid_api_authorization: not-granted
---

# B01 Data: five frozen synthetic incidents

## Accepted upstream and scope

The repository owner instructed "continue to the next stage". Stage 01's gate
records acceptance of Spec e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e
and VERIFY ba52080e93692f9be2220450a8bfb6fd0905827ee9a2a10c9ed6231ade1019ee
at 2026-10-01T20:52:40+05:30. Both were reverified without changing their bytes.
This package prepares executable Data contracts only. No scoring, API request,
installation, migration, stored Case mutation, runtime effect or deployment occurred.

## Frozen cases and cutoff

All cases are synthetic/SIMULATED. Logical interval: 2026-09-01 09:00–10:00 UTC;
15-minute revenue windows; pre ends 09:30, post ends 10:00. Only received rows
at or before the cutoff are observable. Labels/split/private truth stay evaluator-only.

| Case | Opaque frozen case | Split | Frozen expected judgment |
| --- | --- | --- | --- |
${p.cases.map(c => `| ${c.label} | \`${c.scope.caseId}\` | ${c.rubric.split} | ${c.rubric.expectedDiagnosis} |`).join('\n')}

B01: IN/debit conversion falls from 80% to 40%, validation increases after
checkout v142, demand/control conversion remains stable, provider reports healthy.
The later notifications change is an unrelated distractor. B02: the same affected
conversion drop accompanies provider unhealth/declines and stable validation;
the notifications deployment and a customer's causal attribution are distractors.
B03: attempts shift 50/150/100 -> 150/50/100 across the three segments, within-
segment conversion stays 60%/90%/90% and prices stay fixed; aggregate revenue
falls without an observed campaign. B04: counts/rates stay fixed, IN/debit price
50000 -> 40000 matches its typed configuration change, checkout/provider healthy.

B05 has two distinct private worlds with an identical observable cutoff: delayed
complete-window ingestion versus actual acquisition volume loss with missing
telemetry. Private latest-window revenue differs; neither latest window nor its
cause is exposed. Received coverage is 3 of 4 windows per segment and freshness
is unknown. The epistemic answer is insufficient evidence with alternatives and
a specific read-only discriminator, not a lucky delayed-ingestion diagnosis.
The private manifest binds both different world hashes and the equal observable hash.

## Schemas and identity

Frozen contracts: benchmark/contracts.mjs and schema/finding.json, tools.json,
common-definitions.json. incident-data-v2 admits bounded variable INR prices,
one typed pricing_configuration event and observed coverage metadata. Exact
fields, ledger arithmetic, unique opaque IDs, sources, SIMULATED, tenant/case/run
and cutoff are validated. Five fixture files are generated deterministically and
compared in memory; the verifier never regenerates accepted evidence.

All methods emit benchmark-finding-v1: terminal status, signal summary, ranked
hypotheses with support/contradiction IDs, affected segment/change, unresolved
alternatives, recommendation/risk/approval and atomic material claims. Invalid
semantics or citations survive structural parsing for measurement. Failure and
epistemic abstention are distinct. The host creates fresh identities through
bindRun; stable evidence IDs/facts persist and foreign-run access fails closed.

## Evidence and exposure

The three read-only meanings are revenue.inspect, engineering.inspect and
support.search. They return coverage/pricing additions within the same domain;
no generic file/network/action tool exists. Limits are 10 attempts including
invalid calls, 50 rows and 160 query characters, scoped hash cursors and literal
support search. Queries use start-exclusive/end-inclusive time. A complete generic
domain traversal fits exactly 10 attempts; it returns every eagerly available row.

Only task.md, common definitions, finding/tool schemas, initial aggregate signal
and compact eager/query rows are allowlisted for model exposure. The initial
signal states received aggregates, not the facts of unreturned rows. Lossless
compact rows reconstruct every public payload/source/time/ID, with shared
scope/version/truth supplied by the envelope. Ordered offline exposure records
bind request/result hashes and actually exposed IDs. Every allowed surface and
probe result is scanned for private canaries/labels; deliberately leaked canaries fail.

The worker's exact read allowlist is contracts.mjs, tools.mjs and restricted-worker.mjs.
15 actual file-read denials cover private truth/rubric/manifest/generator, evaluator
design, current/historical Spec, old report/store/world, database and traversal.
Writes, child processes and inherited credentials are denied. Untrusted support
text cannot add an approval/execution endpoint. Model injection resistance is
NOT_RUN; Node permissions are not claimed as a general network/OS sandbox.

## Frozen judgments and split

private/rubric.json freezes exact aliases, target segment/change, 23 required
evidence groups, predicates, expected recommendations and false-positive claims.
private/ADJUDICATION.md freezes their interpretation and review procedure.
Typed predicates establish observed facts only; a known ID or matching tag does
not establish that a prose causal claim is supported. Citation existence counts
all occurrences; zero citations is null/no_citations, not perfect precision.

Method-blinded human review covers ambiguous causation/relevance/prose for all
50 planned artifacts, with reasons and unresolved disagreements. Diagnosis is
reported on four cases, B05 abstention separately, including failed runs and
needless abstention. Contradiction uses 0/1/2; active search is N/A for single-shot
and rules. B02–B05 have no consequential executable action. B05 may abstain while
requesting a specific read-only missing discriminator. The author knows the five
families; frozen transfer means not tuned after integration, not pristine holdout.
No rubric changes based on observed transfer performance; corrections version
and regrade every method while retaining original answers.

## Store and version adapter

benchmark/STORE_DESIGN.md specifies a separate new benchmark view/store sharing
generic recorder/authority invariants. No v2 rows enter the A01 v1 store. Existing
A01 prices, fixtures, detector, world, intents/grants/effects and databases remain
unchanged. New host-created benchmark runs record evidence, append-only timeline,
sanitized transcript and raw/parsed findings; comparisons have no effect endpoint.
Build owns persistence and transport implementation. The separate later fresh
B01/A01 demo still requires its exact local-human approval and existing Pause,
scope/hash/nonce/expiry/one-time checks. No such approval is inferred here.

## Checks and limits

13 executable checks passed. They cover frozen generation/schema/ledger, fresh
identity rebinding, count/rate/price/missingness signals, observational equivalence,
eager/query equality/pagination, foreign/future/path/URL/tool denials, actual restricted
reads/writes/children/credentials, inert text/invalid-call budgets, discriminators,
semantic retention, lossless/canary-scanned exposure and preservation.

Largest complete single-shot input: ${singleMax} ASCII bytes; initial tool input:
${fit.sizes[0].toolInitialInputBytes} bytes. Reserving 1024 output and 256 framing
units stays under 8192 on a byte-fallback tokenizer. Actual token usage is null
with reason provider_not_selected. Build must verify its provider-specific tokenizer,
framing and every accumulated context before dispatch; stop on overflow and
never truncate decisive evidence. No whole investigation fit/success is asserted.

Hash-only preservation confirms 3499 outer and 1279 product existing files,
118 archived A01 factory files and 477 stored A01 files unchanged, with identical
branches, HEADs, Git indexes and junctions. Existing uncommitted work, migrations,
fixtures, approval state, databases, history and the excluded trial receipt remain.
Full product build/TS/runtime suites were not invoked: Data changes no application
or migration and those suites would create stored results/read future-stage outputs.
Known pre-existing source-check failures remain documented in the cleanup review
packet; this package makes no full-product pass claim.

## Human review and handoff

The human gate is pending. Review these exact DATA_PACKAGE and VERIFY hashes
and the evaluator-only contract evidence before accepting Stage 02. No Build work
or later-stage acceptance follows automatically. Provider/configuration/budget,
actual tokenizer checks, durable investigator, scoring and exact runtime proposal
are future work under their respective gates. Stage acceptance grants no paid
API call, LIVE change or runtime intervention. The checkout stays uncommitted/unsealed.

## Declared input hashes

Spec/gate/VERIFY, shared constraints and this stage contract are freshness inputs.
The benchmark tree/verifier/contract evidence are frozen package dependencies.
Baseline A01 source/test, evaluator design and existing toolchain are observed
inputs. Hashes use unchanged verify-kit LF normalization and directory pathHash.
The preservation inventory separately uses raw bytes, including accepted history.
After Data acceptance, intentional later-stage observed-source changes are reported
as historical drift; frozen package dependencies still must match. Preservation
evidence remains an immutable record of this preparation, never rewritten.

| Input | SHA-256 |
| --- | --- |
${hashes.join('\n')}
`;
}
function verifyBody(result, checks, preparedAt) {
  const preservation = result.checks.at(-1).repositories;
  return `---
type: stage-verification
unit: b01-api-behavioral-benchmark
stage: 02_data
status: passed
prepared_at: ${preparedAt}
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Data verification

Windows; Node ${process.version}; existing dependencies; no installation/download.
The following commands completed with exit 0 during preparation:

| Command | Evidence |
| --- | --- |
| node factory/01_spec/verify.mjs | Accepted/fresh Spec hashes and 118 archived files verified |
| node factory/02_data/verify.mjs --prepare | 13 deterministic checks; 7 negative package mutations; 22 hash bindings |
| node node_modules/eslint/bin/eslint.js factory/02_data/verify.mjs factory/02_data/benchmark/*.mjs | Targeted lint clean, no output |
| git -c safe.directory=<authoritative-product> diff --check | No whitespace errors |
| git -c safe.directory=<authoritative-outer> diff --check | No whitespace errors |

CONTRACT_EVIDENCE.json contains full deterministic checks and ordered exposure
probe manifests, not scored model answers or API usage. The evidence digest is
${digest(result)}. Package negative checks: ${checks.join('; ')}.

${result.checks.map(c => `- ${c.name}: passed`).join('\n')}

Five different hidden causes, B05 underidentification, 23 exact required groups,
15 actual private reads denied, writes/children denied, clean worker credentials,
10 attempts including failures, matched eager/query universes, lossless compact
serialization and 80 canary-scanned surfaces. Full single-shot/initial context
checks use a stated conservative byte-fallback condition, not measured provider tokens.
Model behavior, transport, paid scoring, durability and runtime approval/effects
are NOT_RUN. Prototype injection probes prove fixed tool dispatch, not API resistance.

Preservation at preparation: ${preservation.map(r => `${r.repository}: ${r.unchangedFiles} existing files, ${r.preservedDirectories} directories, branch ${r.unchangedBranch}, HEAD ${r.unchangedHead}`).join('; ')}.
Product A01 archive 118 files and outputs/a01 477 files are raw-byte unchanged.
No deletion, relocation, Git index/HEAD change, database write or history rewrite.

Full application build, TypeScript, migrations and effect-producing A01 tests are
outside this Data-only change. Existing full-source lint/TS failures and historical
test-path compatibility remain recorded for Build; no global pass is claimed.
The Data gate is pending, Build remains unstarted and release remains unsealed.
`;
}
async function prepare() {
  const gatePath = resolve(output, 'HUMAN_GATE.md');
  if (existsSync(gatePath)) assert.notEqual(frontmatterValue(await readFile(gatePath, 'utf8'), 'decision'), 'accepted', 'never regenerate accepted Data evidence');
  await requireUpstream();
  const result = await runContractChecks();
  runChecked(process.execPath, ['node_modules/eslint/bin/eslint.js', 'factory/02_data/verify.mjs', 'factory/02_data/benchmark/*.mjs'], { cwd: root });
  for (const cwd of [root, resolve(root, '../..')]) runChecked('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/')}`, 'diff', '--check'], { cwd });
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'CONTRACT_EVIDENCE.json'), `${JSON.stringify(result, null, 2)}\n`);
  const text = packageBody(result, await bindings());
  assert.deepEqual(validateDataPackage(text), []);
  const checks = negativePackageChecks(text);
  await writeFile(resolve(output, 'DATA_PACKAGE.md'), text);
  await writeFile(resolve(output, 'VERIFY.md'), verifyBody(result, checks, new Date().toISOString()));
  const dataHash = await fileHash(root, resolve(output, 'DATA_PACKAGE.md'));
  const verifyHash = await fileHash(root, resolve(output, 'VERIFY.md'));
  await writeFile(gatePath, `---
type: human-gate
unit: b01-api-behavioral-benchmark
stage: 02_data
gate_status: open
decision: pending
reviewer: none
reviewed_at: none
data_package_sha256: ${dataHash}
verification_sha256: ${verifyHash}
---

# Data human gate

Stage 02 is prepared and verified; no human acceptance has been recorded.
Review DATA_PACKAGE.md, VERIFY.md and evaluator-only CONTRACT_EVIDENCE.json,
including frozen cases/rubric, B05 ambiguity, exposure/identity boundaries,
conditional context-fit evidence and the separate-store proposal.

Acceptance must bind the exact hashes above. Per CONTEXT.md: "A person accepts
exact Data/VERIFY hashes before Build; expected answers remain inaccessible to
the model/tools." Stop here. Stage acceptance grants no API spend, runtime
intervention, LIVE change, effect, deployment or later-stage acceptance.
`);
}
export async function verifyData() {
  const upstream = await requireUpstream();
  const primary = await readFile(resolve(output, 'DATA_PACKAGE.md'), 'utf8');
  assert.deepEqual(validateDataPackage(primary), []);
  const negatives = negativePackageChecks(primary);
  const gate = await readFile(resolve(output, 'HUMAN_GATE.md'), 'utf8');
  const accepted = frontmatterValue(gate, 'decision') === 'accepted';
  const bound = markdownHashBindings(markdownSection(primary, /^## Declared input hashes$/));
  assert.deepEqual(bound.map(b => b.input).sort(), [...inputPaths].sort());
  const historicalDrift = [];
  for (const b of bound) {
    const actual = await pathHash(root, resolve(root, b.input));
    if (actual !== b.expected && accepted && !immutable(b.input)) historicalDrift.push(b.input);
    else assert.equal(actual, b.expected, `input changed: ${b.input}`);
  }
  const evidence = JSON.parse(await readFile(resolve(output, 'CONTRACT_EVIDENCE.json'), 'utf8'));
  const result = await runContractChecks({ acceptedPreservationEvidence: accepted ? evidence.checks.at(-1) : null });
  assert.equal(canonical(result), canonical(evidence), 'offline contract evidence drift');
  const protectedFiles = await checkImmutableHistory(JSON.parse(await readFile(resolve(stage, 'benchmark/private/preservation-baseline.json'), 'utf8')));
  assert.equal(frontmatterValue(gate, 'data_package_sha256'), await fileHash(root, resolve(output, 'DATA_PACKAGE.md')));
  assert.equal(frontmatterValue(gate, 'verification_sha256'), await fileHash(root, resolve(output, 'VERIFY.md')));
  assert.equal(frontmatterValue(await readFile(resolve(output, 'VERIFY.md'), 'utf8'), 'status'), 'passed');
  assert(['pending', 'accepted', 'changes-requested', 'rejected'].includes(frontmatterValue(gate, 'decision')));
  if (accepted) assert.equal(frontmatterValue(gate, 'gate_status'), 'closed');
  else assert.equal(frontmatterValue(gate, 'gate_status'), 'open');
  return { stage: '02_data', status: 'passed', upstreamGate: upstream.gate, gate: frontmatterValue(gate, 'decision'),
    contractChecks: result.checks.length, packageNegativeChecks: negatives.length, bindings: bound.length,
    cases: 5, protectedHistoricalFiles: protectedFiles, historicalDrift, preservation: accepted ? 'accepted_preparation_record_plus_current_immutable_history' : 'current_full_inventory',
    modelCalls: 0, runtimeEffects: 0, modelEvaluation: 'NOT_RUN', humanRuntimeApproval: 'NOT_RUN' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    if (process.argv.includes('--prepare')) await prepare();
    process.stdout.write(`${JSON.stringify(await verifyData(), null, 2)}\n`);
  })().catch(e => { process.stderr.write(`${e.stack}\n`); process.exitCode = 1; });
}
