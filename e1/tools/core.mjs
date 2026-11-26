// The shared tool layer (section 3 items 1, 9 and 12), built in ticket 08 and imported by 09 and 10: the registry,
// the { result | error, note } envelope with its fixed note templates, DeepSeek's strict-schema rules, argument
// validation, cursor paging and the 1.5k-token cap cut at a row boundary. Every response passes the leak scanner.
import { createHash } from 'node:crypto';
import { requireThat } from '../../db/benchmark/contracts.mjs';
import { canonicalJson } from '../canonical.mjs';
import { WORLD_VERSION } from '../world.mjs';
import { scanForLeaks } from './leaks.mjs';

export const PAGE_ROWS = 20;
// Spec step 3 caps a result at 1.5k tokens; the cap is kept in bytes of the JSON the model is sent. Ticket 02
// measured 2.85-3.01 bytes a token on whole requests, but random base62 ids pack worse than prose, so this
// budgets 2.5. Development batch 1 checks it against the prompt-token growth each result causes.
export const RESULT_TOKEN_CAP = 1500;
export const BYTES_PER_TOKEN = 2.5;
export const RESULT_BYTE_CAP = RESULT_TOKEN_CAP * BYTES_PER_TOKEN;
export const resultBytes = envelope => Buffer.byteLength(JSON.stringify(envelope));

// Every note is one of these. Slots take only numbers, IST times, tool and field names from the toolset, ids that
// passed the tool's pattern, and patterns; never free text. Ticket 10's toolset hash covers them.
export const NOTES = Object.freeze({
  window_more: 'Window {from} to {to} IST; now is {now} IST. Records on this page: {rows}, oldest first. More: call again with the same arguments and this cursor.',
  window_last: 'Window {from} to {to} IST; now is {now} IST. Records on this page: {rows}, oldest first; no more.',
  window_future: 'Window {from} to {to} IST starts after now ({now} IST), so nothing in it has happened yet. Call again with from at or before now.',
  window_order: 'from ({from} IST) is after to ({to} IST). Call {tool} again with from at or before to.',
  list_more: 'As of now ({now} IST). Records on this page: {rows}, oldest first. More: call again with the same arguments and this cursor.',
  list_last: 'As of now ({now} IST). Records on this page: {rows}, oldest first; no more.',
  one: 'As of now ({now} IST); empty fields are left out.',
  settings: 'Dashboard settings as of now ({now} IST).',
  not_found: 'No {thing} {id} exists as of now ({now} IST). Copy the id from a {source} result.',
  arg_missing: '{field} is missing. Call {tool} again with every argument, null only where the schema allows it.',
  arg_extra: 'An argument is not one of {tool}\'s. Its arguments are: {fields}.',
  arg_type: '{field} must be {expected}. Call {tool} again with {field} as {expected}.',
  arg_range: '{field} must be from {min} to {max}. Call {tool} again with {field} in that range.',
  arg_pattern: '{field} must match {pattern}. Call {tool} again with an id copied from a result.',
  cursor_invalid: 'This cursor was not issued for these arguments. Call {tool} again with cursor null, or with the arguments that gave it.',
  unknown_tool: 'There is no such tool. Call one of the listed tools.',
});

export function note(key, vars = {}) {
  requireThat(Object.hasOwn(NOTES, key), `note: no template ${key}`);
  const slots = [...NOTES[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  requireThat(canonicalJson([...new Set(slots)].sort()) === canonicalJson(Object.keys(vars).sort()), `note ${key}: slots ${slots} given ${Object.keys(vars)}`);
  return NOTES[key].replace(/\{(\w+)\}/g, (_, slot) => {
    requireThat(['string', 'number'].includes(typeof vars[slot]), `note ${key}: bad ${slot}`);
    return String(vars[slot]);
  });
}

export const ok = (result, noteText, extra = {}) => ({ result, ...extra, note: noteText });
export const fail = (error, noteText) => ({ error, note: noteText });
export const badRequest = (description, field) => ({ code: 'BAD_REQUEST_ERROR', description, ...(field && { field }) });
// The merchant's clock: "2026-11-24 14:00".
export const ist = unix => new Date((unix + WORLD_VERSION.utc_offset_s) * 1000).toISOString().slice(0, 16).replace('T', ' ');
export const pick = (record, fields) => Object.fromEntries(fields.map(field => [field, record[field]]));
const empty = value => value === null || value === '' || (typeof value === 'object' && Object.keys(value).length === 0);
export const dropEmpty = record => Object.fromEntries(Object.entries(record).filter(([, value]) => !empty(value)));

// DeepSeek's strict mode: every object closed with every property required; a value is optional only as
// anyOf [..., null]; no uniqueItems.
export function checkStrict(schema, at = 'schema') {
  requireThat(schema && typeof schema === 'object' && !('uniqueItems' in schema), `${at}: not a strict schema`);
  if (schema.anyOf) return schema.anyOf.forEach((branch, i) => checkStrict(branch, `${at}.anyOf[${i}]`));
  if (schema.type === 'object') {
    requireThat(schema.additionalProperties === false, `${at}: additionalProperties must be false`);
    const keys = Object.keys(schema.properties ?? {});
    requireThat(canonicalJson([...(schema.required ?? [])].sort()) === canonicalJson(keys.sort()), `${at}: every property must be required`);
    keys.forEach(key => checkStrict(schema.properties[key], `${at}.${key}`));
  }
  if (schema.type === 'array') checkStrict(schema.items, `${at}[]`);
}

const IS = {
  string: v => typeof v === 'string', integer: Number.isInteger, boolean: v => typeof v === 'boolean', null: v => v === null,
  array: Array.isArray, object: v => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
};
const A = { string: 'a string', integer: 'a whole number', boolean: 'true or false', null: 'null', array: 'a list', object: 'an object' };
const expected = schema => (schema.anyOf ? schema.anyOf.map(expected).join(' or ') : A[schema.type]);

// The first problem with `value`, as a note key and its slots, or null.
function problem(schema, value, field) {
  if (schema.anyOf) {
    const fits = schema.anyOf.find(branch => IS[branch.type](value));
    return fits ? problem(fits, value, field) : { key: 'arg_type', field, expected: expected(schema) };
  }
  if (!IS[schema.type](value)) return { key: 'arg_type', field, expected: expected(schema) };
  if (schema.enum && !schema.enum.includes(value)) return { key: 'arg_type', field, expected: `one of ${schema.enum.join(', ')}` };
  if ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum)) {
    return { key: 'arg_range', field, min: schema.minimum ?? 'any', max: schema.maximum ?? 'any' };
  }
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) return { key: 'arg_pattern', field, pattern: schema.pattern };
  if (schema.type === 'object') {
    const keys = Object.keys(schema.properties);
    if (Object.keys(value).some(key => !keys.includes(key))) return { key: 'arg_extra', fields: keys.join(', ') || 'none' };
    for (const key of keys) {
      const at = field ? `${field}.${key}` : key;
      if (!Object.hasOwn(value, key)) return { key: 'arg_missing', field: at };
      const found = problem(schema.properties[key], value[key], at);
      if (found) return found;
    }
  }
  if (schema.type === 'array') {
    for (const [i, item] of value.entries()) { const found = problem(schema.items, item, `${field}[${i}]`); if (found) return found; }
  }
  return null;
}
const ARG_ERRORS = { arg_missing: 'The field is required', arg_extra: 'The request has an extra field', arg_type: 'The field has the wrong type',
  arg_range: 'The field is out of range', arg_pattern: 'The field has the wrong format' };
function argumentError(tool, args) {
  const found = problem(tool.schema, args, '');
  if (!found) return null;
  const { key, ...slots } = found;
  const error = badRequest(ARG_ERRORS[key], slots.field || undefined);
  if (slots.field === '') slots.field = 'arguments';
  return fail(error, note(key, { ...slots, tool: tool.name }));
}

// A cursor is the arguments' fingerprint plus the next row's skip, so it only continues the query that gave it.
const fingerprint = (tool, args) => createHash('sha256').update(canonicalJson({ tool, args: { ...args, cursor: null } })).digest('hex').slice(0, 12);
const readCursor = (tool, args) => {
  if (args.cursor === null) return 0;
  const match = /^([0-9a-f]{12})\.(\d{1,7})$/.exec(args.cursor);
  return match?.[1] === fingerprint(tool, args) ? Number(match[2]) : null;
};
export const CURSOR = { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'null for the first page; then the cursor of the previous result.' };
export const WINDOW = {
  from: { type: 'integer', minimum: 946684800, maximum: 4765046400, description: 'Window start, unix seconds, inclusive.' },
  to: { type: 'integer', minimum: 946684800, maximum: 4765046400, description: 'Window end, unix seconds, inclusive.' },
};

// One page of a list tool. `fetch({ count, skip })` answers a backend collection; rows are projected, then the
// page is cut at a row boundary until the envelope fits the cap, and the cursor resumes at the first row cut.
// With `args.from`/`args.to` the note echoes the window in IST (ticket 02 saw a model send a window a year early).
export async function listPage({ tool, args, now, fetch, project, header = {}, notFound }) {
  const skip = readCursor(tool, args);
  if (skip === null) return fail(badRequest('The cursor is not valid for this request', 'cursor'), note('cursor_invalid', { tool }));
  const windowed = 'from' in args;
  const span = windowed ? { from: ist(args.from), to: ist(args.to), now: ist(now) } : { now: ist(now) };
  if (windowed && args.from > args.to) return fail(badRequest('from must be at or before to', 'from'), note('window_order', { tool, from: span.from, to: span.to }));
  if (windowed && args.from > now) return ok({ ...header, entity: 'collection', count: 0, items: [] }, note('window_future', span), { cursor: null });
  const reply = await fetch({ count: PAGE_ROWS + 1, skip });
  if (!reply.ok && notFound) return fail(reply.error, note('not_found', { ...notFound, now: ist(now) }));
  requireThat(reply.ok, `${tool}: the backend refused a validated query: ${reply.error?.description}`);
  const rows = reply.body.items.slice(0, PAGE_ROWS).map(project);
  for (let n = rows.length; ; n -= 1) {
    const more = n < rows.length || reply.body.items.length > PAGE_ROWS;
    const result = { ...header, entity: 'collection', count: n, items: rows.slice(0, n) };
    const kind = `${windowed ? 'window' : 'list'}_${more ? 'more' : 'last'}`;
    const envelope = ok(result, note(kind, { ...span, rows: n }), { cursor: more ? `${fingerprint(tool, args)}.${skip + n}` : null });
    if (n === 0 || resultBytes(envelope) <= RESULT_BYTE_CAP) return envelope;
  }
}

const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};
export function defineTool({ name, description, schema, handler }) {
  requireThat(/^[a-z][a-z0-9_]{0,63}$/.test(name) && typeof description === 'string' && typeof handler === 'function', `tool ${name}: bad definition`);
  checkStrict(schema, name);
  requireThat(schema.type === 'object', `tool ${name}: arguments must be an object`);
  return Object.freeze({ name, description, schema: deepFreeze(structuredClone(schema)), handler });
}

// The in-process registry (section 3 item 12). `call` validates, runs the handler with { backend, now }, and
// refuses to hand back a result over the cap or one the leak scanner flags: either throws, which the loop
// (ticket 15) records as harness_error, a fail, so nothing past either check ever reaches the model.
export function createToolset(tools) {
  const byName = new Map(tools.map(tool => [tool.name, tool]));
  requireThat(byName.size === tools.length, 'toolset: two tools share a name');
  return Object.freeze({
    definitions: tools.map(({ name, description, schema }) => ({ name, description, schema })),
    async call(name, args, { backend, now }) {
      requireThat(Number.isInteger(now), 'toolset: now must be whole case-clock seconds');
      const tool = byName.get(name);
      const envelope = !tool ? fail(badRequest('The tool does not exist'), note('unknown_tool'))
        : argumentError(tool, args) ?? await tool.handler(args, { backend, now });
      requireThat(resultBytes(envelope) <= RESULT_BYTE_CAP, `${name}: a ${resultBytes(envelope)}-byte result is over the cap`);
      const leaks = scanForLeaks(envelope, { now });
      requireThat(leaks.length === 0, `${name}: leak: ${leaks.join('; ')}`);
      return envelope;
    },
  });
}
