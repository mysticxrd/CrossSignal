import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {fileHash,frontmatterValue,markdownHashBindings,markdownSection} from '../_lib/verify-kit.mjs';
import {deriveFactoryState} from '../_lib/factory-state.mjs';
import {grade} from '../../tests/evaluator/a01/grade.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const output='factory/03_build/output';
export const variants=['checkout','notifications','none','limited','injection'];
export const buildInputs=[
  'factory/03_build/CONTEXT.md','factory/02_data/output/DATA_PACKAGE.md','factory/02_data/output/HUMAN_GATE.md','factory/02_data/output/VERIFY.md','factory/01_spec/output/SPEC.md',
  'factory/_shared/A01_DIRECTION.md','factory/_shared/QUALITY_GATES.md','factory/_lib/verify-kit.mjs','factory/_lib/factory-state.mjs',
  'factory/02_data/a01/contracts.mjs','factory/02_data/a01/world.mjs','factory/02_data/a01/store.sql','factory/02_data/a01/evaluator/truth.json',
  ...['001','002','003'].map(n=>'factory/02_data/a01/observable/'+n+'.json'),
  'db/revenue-leak.mjs','db/case-investigator.mjs','db/flight-recorder-contracts.ts','scripts/run-golden-case-replay.mjs',
  ...['contracts.mjs','analysis.mjs','tools.mjs','investigator.mjs','isolated.mjs','runtime.mjs','store.sql'].map(p=>'db/a01/'+p),
  'scripts/a01-world.mjs','scripts/a01-case.mjs','scripts/run-a01.mjs','tests/a01.test.mjs','tests/evaluator/a01/grade.mjs','tests/evaluator/a01/truth.json','package.json',
  ...['golden-case-replay','case-scenario-matrix','case-investigator','case-response','case-outcome','case-checkout','case-simulation-outcome'].map(n=>'tests/'+n+'.test.mjs'),
  output+'/a01-tests.tap',output+'/grader-tamper-tests.tap',output+'/regression-tests.tap',output+'/replay-run.json',
  ...variants.flatMap(v=>[output+'/replay/'+v+'-1/artifact.json',output+'/replay/'+v+'.grade.json',output+'/replay/'+v+'.md']),
  ...['preview.md','proposal.json','artifact.json'].map(p=>output+'/preview/'+p),
];
export const verificationInputs=['factory/03_build/CONTEXT.md','factory/03_build/verify.mjs',output+'/BUILD_EVIDENCE.md'];
const read=p=>readFileSync(resolve(root,p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
export async function verifyBuild(){
  const state=await deriveFactoryState({projectRoot:root,includeGit:false});
  assert.equal(state.stages[0].status,'complete');assert.equal(state.stages[1].status,'complete');
  const build=read(output+'/BUILD_EVIDENCE.md'),verification=read(output+'/VERIFY.md'),gate=read(output+'/HUMAN_GATE.md');
  for(const [document,expected] of [[build,buildInputs],[verification,verificationInputs]]){
    const bindings=markdownHashBindings(markdownSection(document,/^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b=>b.input).sort(),[...expected].sort(),'missing, duplicate or unexpected binding');
    for(const b of bindings)assert.equal(await fileHash(root,resolve(root,b.input)),b.expected,'binding drift: '+b.input);
  }
  assert.equal(frontmatterValue(build,'status'),'ready-for-review');assert.equal(frontmatterValue(verification,'status'),'passed');
  assert.equal(frontmatterValue(gate,'build_evidence_sha256'),await fileHash(root,resolve(root,output+'/BUILD_EVIDENCE.md')));
  assert.equal(frontmatterValue(gate,'verification_sha256'),await fileHash(root,resolve(root,output+'/VERIFY.md')));
  const decision=frontmatterValue(gate,'decision');assert.ok(['pending','accepted','changes-requested','rejected'].includes(decision));assert.equal(frontmatterValue(gate,'gate_status'),decision==='pending'?'open':'closed');
  if(decision!=='pending'){assert.notEqual(frontmatterValue(gate,'reviewer'),'pending');assert.ok(Number.isFinite(Date.parse(frontmatterValue(gate,'reviewed_at'))));}
  const run=json(output+'/replay-run.json');assert.equal(run.runs.length,5);
  for(const variant of variants){
    const artifact=json(output+'/replay/'+variant+'-1/artifact.json');
    const result=grade(artifact,{intervention:variant==='injection'?'checkout':variant==='limited'?'none':variant,limited:variant==='limited'});
    assert.equal(result.mechanics,'PASS',variant);assert.equal(result.modelEvaluation,'NOT_RUN');assert.equal(result.fullAiHiringProof,false);
    assert.deepEqual(result,json(output+'/replay/'+variant+'.grade.json'));
    assert.equal(createHash('sha256').update(JSON.stringify(artifact)).digest('hex'),run.runs.find(r=>r.variant===variant).sha256,'replay binding mismatch');
  }
  const preview=json(output+'/preview/artifact.json');assert.equal(preview.effects.length,0);assert.equal(preview.timeline.filter(t=>t.type==='approval').length,0);
  assert.match(read(output+'/a01-tests.tap'),/# pass 14\b/);assert.match(read(output+'/a01-tests.tap'),/# fail 0\b/);
  assert.match(read(output+'/regression-tests.tap'),/# pass 19\b/);assert.match(read(output+'/regression-tests.tap'),/# fail 0\b/);
  assert.match(read(output+'/grader-tamper-tests.tap'),/# fail 0\b/);
  return {stage:'03_build',mechanics:'PASS',replayBranches:5,integratedTests:14,regressionTests:19,modelEvaluation:'NOT_RUN',humanRuntimeApproval:'NOT_RUN',gate:decision,inputBindings:buildInputs.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await verifyBuild(),null,2));
