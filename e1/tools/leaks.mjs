// The leak scanner (section 3 item 10): every tool response, on every case, held-out ones included, before it can
// reach the model. It flags what would let a model tell the world is built or see past "now":
// - B01's truthMode, v0.2's access and heldBy labels, and the world's own bookkeeping as keys;
// - words that name the build (simulated, decoy, answer key, held-out, the world version);
// - internal field names in paise, which no Razorpay or WooCommerce shape has;
// - any time field after "now", since the world holds 7 hidden future days: unix seconds under a key ending "at",
//   and WooCommerce's date strings under a key starting "date_", in store time or, ending "_gmt", UTC.
// It returns findings rather than throwing, so a sealing check can list them all. It cannot see inside a count or a
// total, so a tool that gives one must count only what exists as of now, with its own test.
import { WORLD_VERSION, fromStoreTime } from '../world.mjs';

const KEYS = new Set(['truthMode', 'access', 'heldBy', 'answer_key', 'cause', 'decoy', 'seed', 'world_version', 'index', 'woo_id', 'injected']);
const WORDS = /simulat|decoy|answer.?key|held.?out|truth.?mode|e1-world|merchant consent/i;
const TIME = /(^|_)at$/;
const DATE = /^date_[a-z]+(_gmt)?$/;
const dateValue = (key, text) => fromStoreTime(text, key.endsWith('_gmt') ? 0 : WORLD_VERSION.utc_offset_s);
// A Razorpay-form id is 14 random base62 characters; about 0.4% of seeds would spell "decoy" in one by chance. Ids
// are cut out before the word check, alone or inside a note, and the text around them is still checked.
const IDS = /\b[a-z]+_[0-9A-Za-z]{14}\b/g;

export function scanForLeaks(value, { now }) {
  const findings = [];
  const walk = (node, path, key) => {
    if (typeof node === 'string' && WORDS.test(node.replace(IDS, ' '))) findings.push(`${path}: text names the build`);
    if (typeof node === 'number' && TIME.test(key) && node > now) findings.push(`${path}: ${node} is after now (${now})`);
    if (typeof node === 'string' && DATE.test(key) && !(dateValue(key, node) <= now)) findings.push(`${path}: ${node} is after now or not a date`);
    if (!node || typeof node !== 'object') return;
    for (const [k, child] of Object.entries(node)) {
      const at = Array.isArray(node) ? `${path}[${k}]` : `${path}.${k}`;
      if (!Array.isArray(node) && (KEYS.has(k) || /_paise$/.test(k) || WORDS.test(k))) findings.push(`${at}: key is not a real API field`);
      walk(child, at, Array.isArray(node) ? key : k);
    }
  };
  walk(value, '$', '');
  return findings;
}
