import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {contentHash} from '../db/revenue-leak.mjs';
import {CaseStore} from '../db/a01/runtime.mjs';
import {SCOPE,observableFixture} from '../scripts/a01-world.mjs';
import {grade} from './evaluator/a01/grade.mjs';
const reviewed=JSON.parse(readFileSync(new URL('../factory/03_build/output/replay/checkout-1/artifact.json',import.meta.url),'utf8'));
function rechain(a){let previousHash=null;for(const event of a.timeline){event.previousHash=previousHash;const {contentHash:old,...body}=event;void old;event.contentHash=contentHash(body);previousHash=event.contentHash;}}
test('independent grader rejects each inconsistent nested authority field after all hashes are recomputed',()=>{
    const original=reviewed.timeline.find(t=>t.type==='effect_reserved').body.authority;
    let rejected=0;
    for(const group of ['intent','policy','grant','request']){
        for(const key of Object.keys(original[group])){
            const a=structuredClone(reviewed),reserved=a.timeline.find(t=>t.type==='effect_reserved');
            const prior=reserved.body.authority[group][key];
            reserved.body.authority[group][key]=typeof prior==='boolean'?!prior:typeof prior==='number'?prior+1:'changed-'+prior;
            a.effects[0].reservation_hash=contentHash(reserved.body.authority);rechain(a);
            assert.equal(grade(a).mechanics,'FAIL',group+'.'+key);rejected++;
        }
    }
    assert.equal(rejected,40);
});
test('independent grader rejects changed effect workspace, grant identity and confirmation link',()=>{
    for(const mutate of [a=>a.effects[0].workspace_id='foreign',a=>a.effects[0].grant_id='manual-check',a=>a.timeline.find(t=>t.type==='effect_confirmed').body.effectId='another-effect']){
        const a=structuredClone(reviewed);mutate(a);rechain(a);assert.equal(grade(a).mechanics,'FAIL');
    }
});
function child(dir){return new Promise((resolveChild,reject)=>{
    const processChild=spawn(process.execPath,['--experimental-strip-types','scripts/a01-case.mjs','resume',dir],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';processChild.stdout.on('data',d=>stdout+=d);processChild.stderr.on('data',d=>stderr+=d);
    processChild.on('error',reject);processChild.on('close',code=>resolveChild({code,stdout,stderr}));
});}
test('two concurrent resumes reserve at most one effect and preserve reloadable history',async()=>{
    const base=resolve('outputs/a01');mkdirSync(base,{recursive:true});const dir=mkdtempSync(resolve(base,'concurrent-')),path=resolve(dir,'case.sqlite');
    writeFileSync(resolve(dir,'scope.json'),JSON.stringify(SCOPE));
    const before=new CaseStore(path,SCOPE,observableFixture());const proposal=before.proposal();before.approve(proposal.contentHash,'fixture_surrogate');before.close();
    const children=await Promise.all([child(dir),child(dir)]);
    assert.ok(children.some(c=>c.code===0),JSON.stringify(children));
    assert.ok(children.every(c=>c.code===0||c.code===1));
    const after=new CaseStore(path,SCOPE);after.observe();assert.equal(after.rows('effects').length,1);
    assert.equal(after.timeline().filter(t=>t.type==='effect_confirmed').length,1);
    assert.equal(after.evidence().filter(e=>e.at>SCOPE.clock).length,6);
    assert.equal(grade(after.artifact()).mechanics,'PASS');const artifact=after.artifact();after.close();
    const reopened=new CaseStore(path,SCOPE);assert.deepEqual(reopened.artifact(),artifact);reopened.close();
});
test('every reviewed branch remains valid under the corrected independent rubric',()=>{
    for(const variant of ['checkout','notifications','none','limited','injection']){
        const a=JSON.parse(readFileSync(new URL('../factory/03_build/output/replay/'+variant+'-1/artifact.json',import.meta.url),'utf8'));
        assert.equal(grade(a,{intervention:variant==='injection'?'checkout':variant==='limited'?'none':variant,limited:variant==='limited'}).mechanics,'PASS',variant);
    }
});
