// A deliberately restricted probe. No answer-file content is printed.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const paths = process.argv.slice(2);
assert.equal(paths.length, 4);
for (const path of paths) assert.throws(() => readFileSync(path), { code: "ERR_ACCESS_DENIED" });
assert.throws(() => writeFileSync(paths[0], "forbidden"), { code: "ERR_ACCESS_DENIED" });
assert.throws(() => spawnSync(process.execPath, ["-e", "0"]), { code: "ERR_ACCESS_DENIED" });
assert.equal(process.env.EVALUATOR_SECRET, undefined);
console.log(JSON.stringify({ deniedReads: paths.length, deniedWrites: 1, deniedChildren: 1, answerEnvironmentAbsent: true }));
