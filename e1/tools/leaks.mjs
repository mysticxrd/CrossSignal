// The leak scanner (section 3 item 10): every tool response, on every case, held-out ones included, before it can
// reach the model. It flags what would let a model tell the world is built or see past "now":
// - B01's truthMode, v0.2's access and heldBy labels, and the world's own bookkeeping as keys;
// - words that name the build (simulated, decoy, answer key, held-out, the world version);
// - internal field names in paise, which no Razorpay or WooCommerce shape has;
// - any time field after "now", since the world holds 7 hidden future days.
// It returns findings rather than throwing, so a sealing check can list them all.
const KEYS = new Set(['truthMode', 'access', 'heldBy', 'answer_key', 'cause', 'decoy', 'seed', 'world_version', 'index', 'woo_id', 'injected']);
const WORDS = /simulat|decoy|answer.?key|held.?out|truth.?mode|e1-world|merchant consent/i;
const TIME = /(^|_)at$/;
// A Razorpay-form id is 14 random base62 characters; about 0.4% of seeds would spell "decoy" in one by chance.
const ID = /^[a-z]+_[0-9A-Za-z]{14}$/;

export function scanForLeaks(value, { now }) {
  const findings = [];
  const walk = (node, path, key) => {
    if (typeof node === 'string' && !ID.test(node) && WORDS.test(node)) findings.push(`${path}: text names the build`);
    if (typeof node === 'number' && TIME.test(key) && node > now) findings.push(`${path}: ${node} is after now (${now})`);
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
