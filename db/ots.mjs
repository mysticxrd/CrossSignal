import { createHash } from 'node:crypto';

// Reads and writes OpenTimestamps proofs (.ots), the format opentimestamps.org and the `ots` client verify. A proof is a
// file's sha256 and a tree of steps (append, prepend, sha256) leading from it to attestations: a calendar's promise to
// put it in Bitcoin ("pending"), or a Bitcoin block whose merkle root the steps must arrive at. Only the steps the public
// calendars send are supported; anything else is refused rather than guessed at.
const MAGIC = Buffer.concat([Buffer.from('\x00OpenTimestamps\x00\x00Proof\x00', 'latin1'), Buffer.from('bf89e2e884e89294', 'hex')]);
const FORK = 0xff, ATTESTATION = 0x00, SHA256 = 0x08;
const OPS = { 0x08: 'sha256', 0xf0: 'append', 0xf1: 'prepend' };
const OP_TAGS = Object.fromEntries(Object.entries(OPS).map(([tag, op]) => [op, Number(tag)]));
const TAGS = { pending: '83dfe30d2ef90c8e', bitcoin: '0588960d73d71901' };
// The reference client's limits: a step's argument and result, the depth of the tree, and what a calendar URI may hold.
const MAX_MSG = 4096, MAX_DEPTH = 256, URI = /^[A-Za-z0-9\-._/:]{1,1000}$/;
// Calendars an upgrade may ask, as the reference client's default whitelist: a proof names its own calendars, so a
// forged one could otherwise send this script anywhere.
export const TRUSTED_CALENDAR = /^https:\/\/[a-z0-9.-]+\.calendar\.(?:opentimestamps\.org|eternitywall\.com|catallaxy\.com)$/;

export const sha256 = bytes => createHash('sha256').update(bytes).digest();
const fail = message => { throw new Error(`OpenTimestamps proof: ${message}`); };

export function apply(step, msg) {
  const result = step.op === 'sha256' ? sha256(msg)
    : step.op === 'append' ? Buffer.concat([msg, step.arg]) : Buffer.concat([step.arg, msg]);
  return result.length > MAX_MSG ? fail('a step makes a message too long') : result;
}

function varuint(value) {
  const out = [];
  do {
    const low = value % 128;
    value = Math.floor(value / 128);
    out.push(value ? low | 0x80 : low);
  } while (value);
  return Buffer.from(out);
}
const varbytes = bytes => Buffer.concat([varuint(bytes.length), bytes]);

class Reader {
  constructor(bytes) { this.bytes = bytes; this.at = 0; }
  take(n) {
    if (this.at + n > this.bytes.length) fail('it ends early');
    this.at += n;
    return Buffer.from(this.bytes.subarray(this.at - n, this.at));
  }
  byte() { return this.take(1)[0]; }
  varuint() {
    let value = 0;
    for (let shift = 0; shift < 49; shift += 7) {
      const b = this.byte();
      value += (b & 0x7f) * 2 ** shift;
      if (!(b & 0x80)) return value;
    }
    return fail('a number is too large');
  }
  varbytes(min, max) {
    const n = this.varuint();
    return n < min || n > max ? fail(`a field holds ${n} bytes`) : this.take(n);
  }
  end() { if (this.at !== this.bytes.length) fail('it has bytes after its end'); }
}

function readAttestation(reader) {
  const tag = reader.take(8).toString('hex'), payload = new Reader(reader.varbytes(0, 8192));
  if (tag === TAGS.pending) {
    const uri = payload.varbytes(1, 1000).toString('latin1');
    payload.end();
    return URI.test(uri) ? { kind: 'pending', uri } : fail('a calendar URI has characters it may not');
  }
  if (tag === TAGS.bitcoin) {
    const height = payload.varuint();
    payload.end();
    return { kind: 'bitcoin', height };
  }
  return { kind: 'unknown', tag, payload: payload.bytes };
}

// One node of the tree: the attestations on its message, then the steps leading on from it. All but the last item
// are preceded by a fork marker.
function readNode(reader, depth) {
  if (depth > MAX_DEPTH) fail('it nests too deeply');
  const node = { attestations: [], steps: [] };
  const item = tag => {
    if (tag === ATTESTATION) return node.attestations.push(readAttestation(reader));
    const op = OPS[tag] ?? fail(`step 0x${tag.toString(16)} is not supported`);
    const arg = op === 'sha256' ? null : reader.varbytes(1, MAX_MSG);
    node.steps.push({ op, arg, next: readNode(reader, depth + 1) });
  };
  let tag = reader.byte();
  for (; tag === FORK; tag = reader.byte()) item(reader.byte());
  item(tag);
  return node;
}

const payloadOf = a => a.kind === 'pending' ? varbytes(Buffer.from(a.uri, 'latin1'))
  : a.kind === 'bitcoin' ? varuint(a.height) : a.payload;
const tagOf = a => a.kind === 'unknown' ? a.tag : TAGS[a.kind];

function writeNode(node, out) {
  const items = [...node.attestations, ...node.steps];
  if (!items.length) fail('a step leads nowhere');
  items.forEach((item, index) => {
    if (index < items.length - 1) out.push(Buffer.from([FORK]));
    if (item.kind) {
      out.push(Buffer.from([ATTESTATION]), Buffer.from(tagOf(item), 'hex'), varbytes(payloadOf(item)));
      return;
    }
    out.push(Buffer.from([OP_TAGS[item.op]]));
    if (item.arg) out.push(varbytes(item.arg));
    writeNode(item.next, out);
  });
  return out;
}

export function parseOts(bytes) {
  const reader = new Reader(bytes);
  if (!reader.take(MAGIC.length).equals(MAGIC)) fail('the file is not one');
  if (reader.varuint() !== 1) fail('only version 1 is supported');
  if (reader.byte() !== SHA256) fail('only sha256 file hashes are supported');
  const digest = reader.take(32), tree = readNode(reader, 0);
  reader.end();
  return { digest, tree };
}

export const writeOts = (digest, tree) => Buffer.concat([MAGIC, varuint(1), Buffer.from([SHA256]), digest, ...writeNode(tree, [])]);

// A calendar's reply: a tree with no header, starting from the message that was sent.
export function parseTimestamp(bytes) {
  const reader = new Reader(bytes), tree = readNode(reader, 0);
  reader.end();
  return tree;
}

// Every attestation in a tree with the message it commits to and the node it sits on: a pending calendar is asked about
// that message, and a Bitcoin block's merkle root must equal it.
export function attestationsOf(msg, tree) {
  const found = [];
  const walk = (node, at) => {
    for (const attestation of node.attestations) found.push({ ...attestation, msg: at, node });
    for (const step of node.steps) walk(step.next, apply(step, at));
  };
  walk(tree, msg);
  return found;
}

// Adds another tree for the same message into `into`, as the reference client merges calendar replies and upgrades.
export function merge(into, from) {
  for (const attestation of from.attestations)
    if (!into.attestations.some(a => tagOf(a) === tagOf(attestation) && payloadOf(a).equals(payloadOf(attestation))))
      into.attestations.push(attestation);
  for (const step of from.steps) {
    const same = into.steps.find(s => s.op === step.op && (s.arg === step.arg || (s.arg && step.arg && s.arg.equals(step.arg))));
    if (same) merge(same.next, step.next);
    else into.steps.push(step);
  }
  return into;
}

// The start of a new proof, as `ots stamp` builds it: a random nonce is appended before hashing, so a calendar never
// sees the file's own hash. Calendar replies merge into `tip`, whose message is `commitment`.
export function newProof(digest, nonce) {
  const tip = { attestations: [], steps: [] };
  const tree = { attestations: [], steps: [{ op: 'append', arg: nonce, next: { attestations: [], steps: [{ op: 'sha256', arg: null, next: tip }] } }] };
  return { tree, tip, commitment: sha256(Buffer.concat([digest, nonce])) };
}
