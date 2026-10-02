import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawHash, json, DIRECTORY } from './preservation.mjs';
import { ROOT } from '../../inspection.mjs';
import { executionPreflight, executeShowcase } from './run.mjs';

const args=process.argv.slice(2);
try {
  assert(args.length===1&&['--preflight','--execute'].includes(args[0]),'Explicit fixed operation required');
  const binding=await json(resolve(DIRECTORY,'LAUNCH_BINDINGS.json'));
  assert.equal(await rawHash(fileURLToPath(import.meta.url)),binding.launcherRawSha256);
  assert.equal(await rawHash(resolve(DIRECTORY,'OFFLINE_PROOF.json')),binding.offlineProofRawSha256);
  // The host user differs from the sandbox file owner. Scope Git's read-only
  // trust exception to this authoritative repository in this child process.
  // No global config, ownership, index or parent environment is modified.
  const count=Number(process.env.GIT_CONFIG_COUNT??'0');
  assert(Number.isSafeInteger(count)&&count>=0&&count<=16,'Unknown Git environment');
  process.env.GIT_CONFIG_COUNT=String(count+1);
  process.env[`GIT_CONFIG_KEY_${count}`]='safe.directory';
  process.env[`GIT_CONFIG_VALUE_${count}`]=ROOT.replaceAll('\\','/').replace(/\/$/,'');
  process.env.GIT_OPTIONAL_LOCKS='0';
  if(args[0]==='--preflight') {
    await executionPreflight();process.stdout.write(JSON.stringify({status:'host_preflight_passed',providerRequests:0,modelRequests:0})+'\n');
  } else {
    const summary=await executeShowcase();
    process.stdout.write(JSON.stringify({sessionId:summary.sessionId,completedRecords:summary.completedRecords,
      complete:summary.complete,modelRevision:summary.modelRevision,transport:summary.transport,blocker:summary.blocker})+'\n');
    if(!summary.complete)process.exitCode=2;
  }
} catch {
  process.stderr.write('showcase_host_launch_blocked; no fallback or automatic retry; inspect immutable claim/results before resuming\n');
  process.exitCode=1;
}
