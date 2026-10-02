import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileHash,frontmatterValue,markdownHashBindings,markdownSection} from '../_lib/verify-kit.mjs';
import {deriveFactoryState} from '../_lib/factory-state.mjs';
import {grade} from '../../tests/evaluator/a01/grade.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out='factory/04_verify/output';
export const variants=['checkout','notifications','none','limited','injection'];
export const reportInputs=[
    'factory/04_verify/CONTEXT.md','factory/03_build/output/BUILD_EVIDENCE.md','factory/03_build/output/HUMAN_GATE.md','factory/03_build/output/VERIFY.md','factory/03_build/verify.mjs',
    'factory/01_spec/output/SPEC.md','factory/_shared/A01_DIRECTION.md','factory/_shared/QUALITY_GATES.md','factory/_lib/verify-kit.mjs','factory/_lib/factory-state.mjs',
    ...['contracts.mjs','analysis.mjs','tools.mjs','investigator.mjs','isolated.mjs','runtime.mjs','store.sql'].map(p=>'db/a01/'+p),
    'db/flight-recorder-contracts.ts','db/revenue-leak.mjs','scripts/a01-world.mjs','scripts/a01-case.mjs','scripts/run-a01.mjs',
    'tests/a01.test.mjs','tests/a01-release.test.mjs','tests/evaluator/a01/grade.mjs','tests/evaluator/a01/truth.json','package.json',
    ...['golden-case-replay','case-scenario-matrix','case-investigator','case-response','case-outcome','case-checkout','case-simulation-outcome'].map(n=>'tests/'+n+'.test.mjs'),
    ...['integrated-tests.tap','regression-tests.tap','cold-replay.json','before-fix-probe.json','after-fix-probe.json','model-discovery.json','corrections/grade.before.txt'].map(p=>out+'/'+p),
    ...variants.flatMap(v=>[out+'/replay/'+v+'-1/artifact.json',out+'/replay/'+v+'.grade.json',out+'/replay/'+v+'.md']),
];
export const verificationInputs=['factory/04_verify/CONTEXT.md','factory/04_verify/verify.mjs',out+'/VERIFICATION_REPORT.md'];
const read=p=>readFileSync(resolve(root,p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
export async function verifyStage(){
    const state=await deriveFactoryState({projectRoot:root,includeGit:false});
    for(let i=0;i<3;i++)assert.equal(state.stages[i].status,'complete','upstream not accepted/fresh');
    const preserved=['app','worker','drizzle','supabase','package-lock.json','eslint.config.mjs','vite.config.ts'];
    const gitBaseline=spawnSync('git',['diff','--name-only','58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11','--',...preserved],{cwd:root,encoding:'utf8'});
    assert.equal(gitBaseline.status,0);assert.equal(gitBaseline.stdout.trim(),'','preserved product/build inputs changed');
    const local=spawnSync('git',['status','--porcelain','--untracked-files=all','--',...preserved],{cwd:root,encoding:'utf8'});
    assert.equal(local.status,0);assert.equal(local.stdout.trim(),'','new or changed preserved product files');
    // Keep the reviewed Build immutable. Permit only the documented evaluator
    // correction; every other reviewed source/evidence binding must still match.
    const prior=markdownHashBindings(markdownSection(read('factory/03_build/output/BUILD_EVIDENCE.md'),/^## Declared input hashes$/));
    let corrections=0;
    for(const binding of prior){
        const actual=await fileHash(root,resolve(root,binding.input));
        if(actual===binding.expected)continue;
        assert.equal(binding.input,'tests/evaluator/a01/grade.mjs','unexpected Build drift');
        assert.equal(await fileHash(root,resolve(root,out+'/corrections/grade.before.txt')),binding.expected);corrections++;
    }
    assert.equal(corrections,1);
    const report=read(out+'/VERIFICATION_REPORT.md'),verification=read(out+'/VERIFY.md'),gate=read(out+'/HUMAN_GATE.md');
    for(const [document,expected] of [[report,reportInputs],[verification,verificationInputs]]){
        const bindings=markdownHashBindings(markdownSection(document,/^## Declared input hashes$/));
        assert.deepEqual(bindings.map(b=>b.input).sort(),[...expected].sort());
        for(const b of bindings)assert.equal(await fileHash(root,resolve(root,b.input)),b.expected,'binding drift: '+b.input);
    }
    assert.equal(frontmatterValue(verification,'status'),'passed');
    assert.equal(frontmatterValue(report,'status'),'ready-for-review');
    assert.equal(frontmatterValue(report,'model_evaluation'),'NOT_RUN');
    assert.equal(frontmatterValue(report,'full_ai_hiring_proof'),'false');
    assert.equal(frontmatterValue(gate,'verification_report_sha256'),await fileHash(root,resolve(root,out+'/VERIFICATION_REPORT.md')));
    assert.equal(frontmatterValue(gate,'verification_sha256'),await fileHash(root,resolve(root,out+'/VERIFY.md')));
    const decision=frontmatterValue(gate,'decision');assert.ok(['pending','accepted','changes-requested','rejected'].includes(decision));assert.equal(frontmatterValue(gate,'gate_status'),decision==='pending'?'open':'closed');
    if(decision!=='pending'){assert.ok(frontmatterValue(gate,'reviewer')&&!['pending'].includes(frontmatterValue(gate,'reviewer')));assert.ok(Number.isFinite(Date.parse(frontmatterValue(gate,'reviewed_at'))));}
    const cold=json(out+'/cold-replay.json'),baseline=json('factory/03_build/output/replay-run.json');
    assert.equal(cold.runs.length,5);
    for(const v of variants){
        const a=json(out+'/replay/'+v+'-1/artifact.json'),result=grade(a,{intervention:v==='injection'?'checkout':v==='limited'?'none':v,limited:v==='limited'});
        assert.equal(result.mechanics,'PASS');assert.equal(result.fullAiHiringProof,false);assert.equal(result.modelEvaluation,'NOT_RUN');
        assert.deepEqual(result,json(out+'/replay/'+v+'.grade.json'));
        const hash=createHash('sha256').update(JSON.stringify(a)).digest('hex');
        assert.equal(hash,cold.runs.find(r=>r.variant===v).sha256);assert.equal(hash,baseline.runs.find(r=>r.variant===v).sha256);
    }
    assert.match(read(out+'/integrated-tests.tap'),/# pass 18\b/);assert.match(read(out+'/integrated-tests.tap'),/# fail 0\b/);
    assert.match(read(out+'/regression-tests.tap'),/# pass 19\b/);assert.match(read(out+'/regression-tests.tap'),/# fail 0\b/);
    assert.equal(json(out+'/before-fix-probe.json').observed,'PASS');assert.equal(json(out+'/after-fix-probe.json').observed,'FAIL');
    const discovery=json(out+'/model-discovery.json');assert.equal(discovery.modelEvaluation,'NOT_RUN');assert.equal(discovery.paidCalls,0);assert.equal(discovery.downloads,0);
    for(let i=1;i<=12;i++)assert.ok(report.includes('A01-'+String(i).padStart(2,'0')));
    for(let i=1;i<=9;i++)assert.ok(report.includes('NEG-A01-'+String(i).padStart(2,'0')));
    return {stage:'04_verify',mechanics:'PASS',integratedTests:18,regressionTests:19,coldReplayBranches:5,authorityMutationsRejected:40,documentedCorrections:corrections,modelEvaluation:'NOT_RUN',humanRuntimeApproval:'NOT_RUN',fullAiHiringProof:false,gate:decision};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await verifyStage(),null,2));
