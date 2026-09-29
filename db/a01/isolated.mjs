import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { queryObservable } from './tools.mjs';
import { nextStep } from './investigator.mjs';
let raw = '';
for await (const chunk of process.stdin) {
    raw += chunk;
    if (raw.length > 2000000)
        throw new Error('input limit');
}
const input = JSON.parse(raw);
let result;
if (input.operation === 'query')
    result = queryObservable(input.observable, input.scope, input.tool, input.args);
else if (input.operation === 'next')
    result = nextStep(input);
else if (input.operation === 'probe') {
    let reads = 0;
    for (const path of input.paths) {
        try {
            readFileSync(path);
            throw new Error('private read allowed');
        }
        catch (e) {
            if (e.code !== 'ERR_ACCESS_DENIED')
                throw e;
            reads++;
        }
    }
    let write = false, child = false;
    try {
        writeFileSync(input.paths[0], 'forbidden');
    }
    catch (e) {
        if (e.code !== 'ERR_ACCESS_DENIED')
            throw e;
        write = true;
    }
    try {
        spawnSync(process.execPath, ['-e', '']);
    }
    catch (e) {
        if (e.code !== 'ERR_ACCESS_DENIED')
            throw e;
        child = true;
    }
    result = { reads, write, child, cleanEnvironment: !process.env.EVALUATOR_SECRET };
}
else
    throw new Error('unknown operation');
process.stdout.write(JSON.stringify(result));
