import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseStore } from '../db/a01/runtime.mjs';
import { SCOPE, observableFixture } from './a01-world.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)), base = resolve(root, 'outputs/a01');
mkdirSync(base, { recursive: true });
const [command = 'prepare', ...args] = process.argv.slice(2);
function safeDirectory(path) { const dir = resolve(path), rel = relative(base, dir); if (!rel || rel.startsWith('..') || isAbsolute(rel))
    throw new Error('Case directory must be a child of outputs/a01'); return dir; }
let store;
try {
    if (command === 'prepare' || command === 'replay') {
        if (args.length > 2)
            throw new Error('expected optional output directory and variant');
        const dir = args[0] ? safeDirectory(args[0]) : mkdtempSync(resolve(base, 'case-'));
        const variant = args[1] ?? 'checkout';
        if (!['checkout', 'notifications', 'none', 'limited', 'injection'].includes(variant))
            throw new Error('unknown variant');
        mkdirSync(dir, { recursive: true });
        if (existsSync(resolve(dir, 'scope.json')))
            throw new Error('existing run preserved; use inspect/approve to continue it');
        const scope = { ...SCOPE, runId: command === 'replay' ? 'run-0001' : `run-${Date.now()}` };
        writeFileSync(resolve(dir, 'scope.json'), JSON.stringify(scope, null, 2), { flag: 'wx' });
        store = new CaseStore(resolve(dir, 'case.sqlite'), scope, observableFixture({ scope, limited: variant === 'limited', injection: variant === 'injection' }));
        const finding = store.investigate();
        if (finding.decision === 'propose' && variant !== 'none') {
            const action = variant === 'notifications' ? { kind: 'simulated_rollback', service: 'notifications', fromVersion: 'v8', toVersion: 'v7', environment: 'SIMULATED', maxRuns: 1, maxCostMinor: 0, externalWrite: false } : null;
            const proposal = store.proposal(action);
            if (command === 'replay') {
                store.approve(proposal.contentHash, 'fixture_surrogate');
                store.execute();
            }
            else {
                const approveCommand = 'node --experimental-strip-types scripts/a01-case.mjs approve "' + dir + '" ' + proposal.contentHash;
                const preview = '# Simulated checkout investigation — awaiting your approval\n\nIndian debit-card checkout fell from 95% to 60%; controls stayed at 95%. The deterministic baseline found a matching checkout change and validation errors, then checked provider health and support evidence.\n\n## Proposed intervention\n\nRollback **' + proposal.action.service + ' ' + proposal.action.fromVersion + ' → ' + proposal.action.toVersion + '** in the local simulator. One execution, zero cost, no external write. Observe two new simulated windows afterward.\n\nNo rollback has been approved or executed. This is a scripted baseline, not evidence of AI investigation quality or recovered business revenue.\n\n## Competing explanations\n\n' + finding.hypotheses.map(h => '- **' + h.cause + '**: ' + h.status + '. Evidence: ' + h.evidenceIds.join(', ')).join('\n') + '\n\nProvider contradiction check: ' + finding.contradiction.result + '\n\n[Exact proposal](proposal.json) · [Saved Case timeline](artifact.json)\n\n## Approve this exact proposal\n\nApproval binds payload hash `' + proposal.contentHash + '`. To approve the displayed simulated intervention, run:\n\n```powershell\n' + approveCommand + '\n```\n\nUse the inspect command to reopen this Case without execution. Data/Build stage acceptance is separate from this runtime approval.\n';
                writeFileSync(resolve(dir, 'proposal.json'), JSON.stringify(proposal, null, 2), { flag: 'wx' });
                writeFileSync(resolve(dir, 'preview.md'), preview, { flag: 'wx' });
                process.stdout.write('SIMULATED — awaiting exact local approval\nPreview: ' + resolve(dir, 'preview.md') + '\n\n' + approveCommand + '\n');
                writeFileSync(resolve(dir, 'artifact.json'), JSON.stringify(store.artifact(), null, 2));
                process.exitCode = 0;
            }
        }
        if (command === 'replay' || finding.decision !== 'propose') {
            store.observe();
            const artifact = store.artifact();
            writeFileSync(resolve(dir, 'artifact.json'), JSON.stringify(artifact, null, 2));
            process.stdout.write(JSON.stringify(artifact));
        }
    }
    else if (['approve', 'inspect', 'resume', 'pause', 'unpause', 'crash-probe'].includes(command)) {
        const [path, hash] = args;
        if (args.length > (command === 'approve' ? 2 : 1))
            throw new Error('unexpected arguments');
        const dir = safeDirectory(path), scope = JSON.parse(readFileSync(resolve(dir, 'scope.json'), 'utf8'));
        store = new CaseStore(resolve(dir, 'case.sqlite'), scope);
        if (command === 'pause' || command === 'unpause')
            store.setPause(command === 'pause');
        if (command === 'approve') {
            store.approve(hash, 'local_human');
            store.execute();
            store.observe();
        }
        if (command === 'resume') {
            if (store.rows('grants').length && !store.rows('effects').length)
                store.execute();
            if (store.rows('effects').length)
                store.observe();
        }
        if (command === 'crash-probe')
            store.execute({ crash: true });
        const artifact = store.artifact();
        if (command !== 'inspect')
            writeFileSync(resolve(dir, 'artifact.json'), JSON.stringify(artifact, null, 2));
        process.stdout.write(JSON.stringify(artifact, null, 2));
    }
    else
        throw new Error('commands: prepare, approve, inspect, resume, replay, pause, unpause');
}
finally {
    store?.close();
}
