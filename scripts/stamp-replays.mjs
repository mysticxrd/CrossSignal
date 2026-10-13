// Timestamps the committed replay recordings with OpenTimestamps, so anyone can check that a recording has not changed
// since a Bitcoin block without trusting this repository or its author. Only each file's sha256, salted with a random
// nonce, leaves this machine. Writes db/replays/<runId>.json.ots (the proof) and db/replays/stamps.json (what the
// replay page shows). A recording that no longer matches its proof is reported, never quietly re-stamped.
// Usage: node scripts/stamp-replays.mjs             stamp every recording that has no proof
//        node scripts/stamp-replays.mjs --upgrade   add Bitcoin attestations to proofs the calendars have committed
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireThat } from '../db/benchmark/contracts.mjs';
import { attestationsOf, merge, newProof, parseOts, parseTimestamp, sha256, TRUSTED_CALENDAR, writeOts } from '../db/ots.mjs';

const dir = fileURLToPath(new URL('../db/replays/', import.meta.url));
// The reference client's default calendars. Each pool forwards to its own calendar, which commits to Bitcoin.
const POOLS = ['https://a.pool.opentimestamps.org', 'https://b.pool.opentimestamps.org', 'https://a.pool.eternitywall.com',
  'https://ots.btc.catallaxy.com'];
const EXPLORERS = ['https://blockstream.info/api', 'https://mempool.space/api'];
const HEADERS = { accept: 'application/vnd.opentimestamps.v1', 'user-agent': 'crosssignal-stamp-replays' };
const MIN_CALENDARS = 2;
const SUMMARY = join(dir, 'stamps.json');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const summary = existsSync(SUMMARY) ? JSON.parse(readFileSync(SUMMARY, 'utf8')) : {};
const save = () => writeFileSync(SUMMARY, json(Object.fromEntries(Object.entries(summary).sort())));

async function get(url, init) {
  const response = await fetch(url, { ...init, headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!response.ok && response.status !== 404) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function stamp(runId, digest) {
  const { tree, tip, commitment } = newProof(digest, randomBytes(16));
  const calendars = [];
  for (const pool of POOLS) {
    try {
      const reply = await get(`${pool}/digest`, { method: 'POST', body: commitment });
      requireThat(reply.ok, `${pool}: HTTP ${reply.status}`);
      const part = parseTimestamp(Buffer.from(await reply.arrayBuffer()));
      const pending = attestationsOf(commitment, part).filter(a => a.kind === 'pending' && TRUSTED_CALENDAR.test(a.uri));
      requireThat(pending.length, `${pool} answered without a calendar this script trusts`);
      merge(tip, part);
      calendars.push(...pending.map(a => a.uri));
    } catch (error) {
      console.warn(`${runId}: ${pool} did not stamp it: ${error.message}`);
    }
  }
  requireThat(calendars.length >= MIN_CALENDARS, `${runId}: ${calendars.length} calendars answered, ${MIN_CALENDARS} needed`);
  writeFileSync(join(dir, `${runId}.json.ots`), writeOts(digest, tree), { flag: 'wx' });
  summary[runId] = { sha256: digest.toString('hex'), submittedAtUtc: new Date().toISOString(), calendars, bitcoin: null };
  save();
  console.log(`${runId}: sent to ${calendars.length} calendars; run --upgrade in a few hours for the Bitcoin block`);
}

// The block's merkle root, from the first explorer that answers. Explorers print it byte-reversed.
async function blockAt(height) {
  for (const api of EXPLORERS) {
    try {
      const hash = (await (await get(`${api}/block-height/${height}`)).text()).trim();
      const block = await (await get(`${api}/block/${hash}`)).json();
      return { height, blockHash: block.id, blockTimeUtc: new Date(block.timestamp * 1000).toISOString(),
        merkleRoot: Buffer.from(block.merkle_root, 'hex').reverse() };
    } catch (error) {
      console.warn(`${api}: ${error.message}`);
    }
  }
  throw new Error(`no block explorer answered for block ${height}`);
}

async function upgrade(runId, digest, proof) {
  let changed = false;
  for (const pending of attestationsOf(digest, proof.tree).filter(a => a.kind === 'pending')) {
    if (attestationsOf(pending.msg, pending.node).some(a => a.kind === 'bitcoin')) continue;
    if (!TRUSTED_CALENDAR.test(pending.uri)) {
      console.warn(`${runId}: not asking ${pending.uri}, which is not a known calendar`);
      continue;
    }
    const reply = await get(`${pending.uri}/timestamp/${pending.msg.toString('hex')}`);
    if (reply.status === 404) {
      console.log(`${runId}: ${pending.uri} has not reached Bitcoin yet`);
      continue;
    }
    merge(pending.node, parseTimestamp(Buffer.from(await reply.arrayBuffer())));
    changed = true;
  }
  const heights = [...new Set(attestationsOf(digest, proof.tree).filter(a => a.kind === 'bitcoin').map(a => a.height))];
  // Every block the proof names must have the merkle root the proof arrives at; the earliest is the claim shown.
  const blocks = [];
  for (const height of heights.sort((a, b) => a - b)) {
    const block = await blockAt(height);
    const reached = attestationsOf(digest, proof.tree).filter(a => a.kind === 'bitcoin' && a.height === height);
    requireThat(reached.every(a => a.msg.equals(block.merkleRoot)), `${runId}: the proof does not reach block ${height}'s merkle root`);
    blocks.push(block);
  }
  if (changed) writeFileSync(join(dir, `${runId}.json.ots`), writeOts(digest, proof.tree));
  if (blocks.length) {
    const [{ height, blockHash, blockTimeUtc }] = blocks;
    summary[runId] = { ...summary[runId], bitcoin: { height, blockHash, blockTimeUtc } };
    save();
    console.log(`${runId}: in Bitcoin block ${height}, mined ${blockTimeUtc}`);
  }
}

const upgrading = process.argv.includes('--upgrade');
for (const name of readdirSync(dir).filter(file => /^r_[0-9a-f]{12}\.json$/.test(file)).sort()) {
  const runId = name.slice(0, -'.json'.length), proofFile = join(dir, `${name}.ots`);
  const digest = sha256(readFileSync(join(dir, name)));
  if (!existsSync(proofFile)) {
    if (upgrading) console.log(`${runId}: has no proof yet; run without --upgrade first`);
    else await stamp(runId, digest);
    continue;
  }
  const proof = parseOts(readFileSync(proofFile));
  requireThat(proof.digest.equals(digest), `${runId}: the recording changed after it was stamped. Restore it with git, or `
    + `delete ${name}.ots to stamp the new bytes; the new proof will carry today's date.`);
  requireThat(summary[runId]?.sha256 === digest.toString('hex'), `${runId}: stamps.json does not describe its proof`);
  if (upgrading && !summary[runId].bitcoin) await upgrade(runId, digest, proof);
  else if (!upgrading) console.log(`${runId}: already stamped`);
}
