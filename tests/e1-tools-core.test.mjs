import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURSOR, PAGE_ROWS, RESULT_BYTE_CAP, WINDOW, checkStrict, createToolset, defineTool, listPage, note, resultBytes,
} from '../e1/tools/core.mjs';
import { scanForLeaks } from '../e1/tools/leaks.mjs';

const NOW = Date.parse('2026-11-24T14:00:00+05:30') / 1000;
const T0 = NOW - 86400;
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

// 57 records, two to a minute (so time ties are broken by id), every seventh one fat enough to push a page over
// the cap. The stub answers like a backend collection: window, time order then id, count and skip, no total.
const records = Array.from({ length: 57 }, (_, i) => ({
  id: `rec_${String(56 - i).padStart(3, '0')}`, created_at: T0 + Math.floor(i / 2) * 60, text: 'x'.repeat(i % 7 ? 120 : 400),
}));
const sorted = [...records].sort((a, b) => a.created_at - b.created_at || (a.id < b.id ? -1 : 1));
let fetches = 0;
const backend = {
  now: async () => NOW,
  list: ({ from, to, count, skip }) => {
    fetches += 1;
    const items = sorted.filter(r => r.created_at >= from && r.created_at <= to).slice(skip, skip + count);
    return { ok: true, http: 200, body: { entity: 'collection', count: items.length, items } };
  },
  one: id => (records.some(r => r.id === id) ? { ok: true, http: 200, body: records.find(r => r.id === id) }
    : { ok: false, http: 400, error: { code: 'BAD_REQUEST_ERROR', description: 'The id provided does not exist', field: 'id' } }),
};
const tools = createToolset([
  defineTool({
    name: 'stub_list', description: 'Stub records in a window.', schema: object({ ...WINDOW, cursor: CURSOR }),
    handler: (args, ctx) => listPage({ tool: 'stub_list', args, now: ctx.now, project: r => r,
      fetch: page => ctx.backend.list({ from: args.from, to: args.to, ...page }) }),
  }),
  defineTool({
    name: 'stub_one', description: 'One stub record.', schema: object({ id: { type: 'string', pattern: '^rec_[0-9]{3}$' }, cursor: CURSOR }),
    handler: (args, ctx) => listPage({ tool: 'stub_one', args, now: ctx.now, project: r => r,
      notFound: { field: 'id', thing: 'record', id: args.id, source: 'stub_list' },
      fetch: async page => { const reply = ctx.backend.one(args.id); return reply.ok ? { ...reply, body: { entity: 'collection', count: 1, items: [reply.body].slice(page.skip) } } : reply; } }),
  }),
]);
const call = (name, args) => tools.call(name, args, { backend });

test('a strict schema closes every object, requires every property, and has no uniqueItems', () => {
  for (const { schema } of tools.definitions) checkStrict(schema);
  const strict = object({ a: { type: 'string' }, b: { anyOf: [{ type: 'integer' }, { type: 'null' }] } });
  checkStrict(strict);
  assert.throws(() => checkStrict({ ...strict, required: ['a'] }), /every property must be required/);
  assert.throws(() => checkStrict({ ...strict, additionalProperties: true }), /additionalProperties/);
  assert.throws(() => checkStrict({ type: 'array', items: { type: 'string' }, uniqueItems: true }), /not a strict schema/);
  assert.throws(() => checkStrict(object({ a: object({ b: { type: 'string' } }) , c: { type: 'object', properties: {} } })), /additionalProperties/);
  assert.throws(() => defineTool({ name: 'Bad-Name', description: '', schema: object({}), handler: () => {} }), /bad definition/);
});

test('cursor paging returns every record once, in time order, each page cut at a row boundary under the cap', async () => {
  const pages = [];
  let cursor = null;
  do {
    pages.push(await call('stub_list', { from: T0, to: NOW, cursor }));
    cursor = pages.at(-1).cursor;
  } while (cursor);
  assert.deepEqual(pages.flatMap(p => p.result.items.map(r => r.id)), sorted.map(r => r.id));
  for (const page of pages) {
    assert.ok(resultBytes(page) <= RESULT_BYTE_CAP);
    assert.equal(page.result.count, page.result.items.length);
    assert.ok(!('total' in page.result));
  }
  assert.ok(pages.some(p => p.result.count < PAGE_ROWS && p.cursor), 'the cap cut a page short');
  assert.ok(pages.length > Math.ceil(records.length / PAGE_ROWS));
  assert.match(pages[0].note, /^Window 2026-11-23 14:00:00 to 2026-11-24 14:00:00 IST; now is 2026-11-24 14:00:00 IST\. Records on this page: \d+, oldest first\. More:/);
  assert.match(pages.at(-1).note, /no more\.$/);
});

test('a cursor continues only the query that gave it; a window after now returns the real empty shape unasked', async () => {
  const first = await call('stub_list', { from: T0, to: NOW, cursor: null });
  for (const args of [{ from: T0 + 1, to: NOW, cursor: first.cursor }, { from: T0, to: NOW, cursor: `000000000000.${first.result.count}` },
    { from: T0, to: NOW, cursor: 'anything' }]) {
    const envelope = await call('stub_list', args);
    assert.deepEqual(envelope.error, { code: 'BAD_REQUEST_ERROR', description: 'The cursor is not valid for this request', field: 'cursor' });
    assert.match(envelope.note, /Call stub_list again with cursor null/);
  }
  const before = fetches;
  const future = await call('stub_list', { from: NOW + 60, to: NOW + 3600, cursor: null });
  assert.deepEqual(future, { result: { entity: 'collection', count: 0, items: [] }, cursor: null,
    note: 'Window 2026-11-24 14:01:00 to 2026-11-24 15:00:00 IST starts after now (2026-11-24 14:00:00 IST), so nothing in it has happened yet. Call again with from at or before now.' });
  assert.equal(fetches, before, 'the backend is not asked');
  const missing = await call('stub_one', { id: 'rec_999', cursor: null });
  assert.equal(missing.error.description, 'The id provided does not exist');
  assert.deepEqual(missing.error, { code: 'BAD_REQUEST_ERROR', description: 'The id provided does not exist', field: 'id' });
  assert.equal(missing.note, 'No record rec_999 exists as of now (2026-11-24 14:00:00 IST). Copy the id from a stub_list result.');
});

test('bad arguments return an error envelope whose note names the fix in the tool\'s own arguments', async () => {
  const cases = [
    ['stub_list', { from: T0, cursor: null }, 'to', 'to is missing. Call stub_list again with every argument, null only where the schema allows it.'],
    ['stub_list', { from: String(T0), to: NOW, cursor: null }, 'from', 'from must be a whole number. Call stub_list again with from as a whole number.'],
    ['stub_list', { from: T0 * 1000, to: NOW, cursor: null }, 'from', 'from must be from 946684800 to 4765046400. Call stub_list again with from in that range.'],
    ['stub_list', { from: NOW, to: T0, cursor: null }, 'from', 'from (2026-11-24 14:00:00 IST) is after to (2026-11-23 14:00:00 IST). Call stub_list again with from at or before to.'],
    ['stub_list', { from: T0, to: NOW, cursor: 3 }, 'cursor', 'cursor must be a string or null. Call stub_list again with cursor as a string or null.'],
    ['stub_list', { from: T0, to: NOW, cursor: null, count: 50 }, undefined, 'An argument is not one of stub_list\'s. Its arguments are: from, to, cursor.'],
    ['stub_one', { id: 'rec_1', cursor: null }, 'id', 'id must match ^rec_[0-9]{3}$. Call stub_one again with an id copied from a result.'],
    ['stub_one', null, undefined, 'arguments must be an object. Call stub_one again with arguments as an object.'],
    ['refund_payment', {}, undefined, 'There is no such tool. Call one of the listed tools.'],
  ];
  for (const [name, args, field, text] of cases) {
    const envelope = await call(name, args);
    assert.deepEqual(Object.keys(envelope), ['error', 'note'], name);
    assert.equal(envelope.error.code, 'BAD_REQUEST_ERROR');
    assert.equal(envelope.error.field, field);
    assert.equal(envelope.note, text);
  }
});

test('notes come only from the fixed templates, with every slot filled', () => {
  assert.throws(() => note('made_up'), /no template/);
  assert.throws(() => note('one', {}), /slots/);
  assert.throws(() => note('one', { now: '2026-11-24 14:00', extra: 1 }), /slots/);
  assert.throws(() => note('one', { now: { text: 'free' } }), /bad now/);
  assert.equal(note('one', { now: '2026-11-24 14:00:00' }), 'As of now (2026-11-24 14:00:00 IST); empty fields are left out.');
});

test('the leak scanner flags labels, build words, paise fields and the future, and the registry refuses a leak', async () => {
  const findings = scanForLeaks({ result: { truthMode: 'SIMULATED', items: [{ access: 'simulated', amount_paise: 1, created_at: NOW + 1,
    attempts: [{ at: NOW + 5 }] }], text: 'a decoy' } }, { now: NOW });
  assert.equal(findings.length, 8, findings.join('\n'));
  assert.deepEqual(scanForLeaks({ result: { id: 'pay_xxDeCoYxxxxxxx', amount: 100, created_at: NOW, attempts: [{ at: NOW }], note: 'access' } },
    { now: NOW }), [], 'an id that spells a build word by chance is not text');
  const leaky = defineTool({ name: 'leaky', description: 'x', schema: object({}), handler: async (_, { now }) => ({ result: { created_at: now + 1 }, note: 'x' }) });
  await assert.rejects(createToolset([leaky]).call('leaky', {}, { backend }), /leak: \$\.result\.created_at/);
  const huge = defineTool({ name: 'huge', description: 'x', schema: object({}), handler: async () => ({ result: 'x'.repeat(RESULT_BYTE_CAP), note: 'x' }) });
  await assert.rejects(createToolset([huge]).call('huge', {}, { backend }), /over the cap/);
  assert.throws(() => createToolset([leaky, leaky]), /share a name/);
});
