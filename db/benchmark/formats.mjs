// The two case formats behind one interface. incident-data-v2 is the SIMULATED one-hour format of B01-B15, frozen with
// the factory (contracts.mjs, tools.mjs, exposure.mjs, schemas.mjs, task.md). incident-data-v3 is the daily format from
// B16 on (daily.mjs, task-daily.md). The model worker, the run store and the batch runner take everything that depends
// on the format from formatOf, so a v2 case still produces exactly the requests it always did.
import { readFileSync } from 'node:fs';
import * as v2 from './contracts.mjs';
import * as v3 from './daily.mjs';
import { commonDefinitions, exposePacket, exposeQuery } from './exposure.mjs';
import { toolSchemas } from './schemas.mjs';
import { queryObservable } from './tools.mjs';

const task = name => readFileSync(new URL(name, import.meta.url), 'utf8').trim();
const cursorReason = 'cursor must be null or the nextCursor returned for this same query';
const V2 = Object.freeze({
  version: v2.VERSION, truthMode: 'SIMULATED', task: task('./task.md'), commonDefinitions, toolSchemas,
  // Fixed text for a request the host cannot serve; the model never gets its own arguments back.
  reasons: new Map(Object.entries({
    'unknown domain tool': 'unknown tool',
    'tool arguments: unknown/missing fields': 'arguments must be exactly the fields of this tool',
    'invalid timestamp': 'start and end must be UTC timestamps such as 2026-09-01T09:15:00.000Z',
    'query time scope mismatch': `start must be at or after ${v2.START} and before end; end must be at or before ${v2.CUTOFF}, the case clock`,
    'invalid query limit': `limit must be an integer from 1 to ${v2.LIMITS.rows}`,
    'invalid cursor': cursorReason, 'cursor scope mismatch': cursorReason, 'cursor offset mismatch': cursorReason,
    'invalid segment': 'segment must be null, IN/debit, IN/credit or GB/debit',
    'invalid engineering query': 'service must be checkout, notifications, payment-provider or pricing; kind must be changes or health',
    'invalid support query': `query must be text of at most ${v2.LIMITS.queryCharacters} characters`,
  })),
  times: () => ({ start: v2.START, clock: v2.CUTOFF }),
  validateScope: v2.validateScope, validateObservable: v2.validateObservable, bindRun: v2.bindRun,
  queryObservable, exposePacket, exposeQuery,
});
const dailyTask = task('./task-daily.md');

// Anything that is not a daily case is held to the v2 contract, which refuses what it does not know.
export function formatOf(input) {
  if (input?.version !== v3.VERSION) return V2;
  const frame = v3.validateFrame(input.frame);
  return Object.freeze({
    version: v3.VERSION, truthMode: v3.TRUTH, task: dailyTask, commonDefinitions: v3.commonDefinitions,
    toolSchemas: v3.toolSchemas(frame), reasons: v3.queryReasons(frame), times: () => ({ start: frame.start, clock: frame.clock }),
    validateScope: scope => v3.validateScope(scope, frame), validateObservable: v3.validateObservable, bindRun: v3.bindRun,
    queryObservable: v3.queryObservable, exposePacket: v3.exposePacket, exposeQuery: v3.exposeQuery,
  });
}
// The tools a model may call: the v2 ones, or the daily ones over this frame's segments and services.
export const toolsFor = (frame = null) => frame === null ? toolSchemas : formatOf({ version: v3.VERSION, frame }).toolSchemas;
// A run store keeps a daily case's frame in its metadata and its events row by row; this puts the observable back together.
export function storedObservable({ scope, frame }, events) {
  return frame === undefined
    ? { version: v2.VERSION, truthMode: 'SIMULATED', caseRef: scope.caseId, asOf: scope.clock, events }
    : { version: v3.VERSION, truthMode: v3.TRUTH, caseRef: scope.caseId, asOf: scope.clock, frame, events };
}
