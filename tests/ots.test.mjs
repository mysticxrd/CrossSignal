import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { apply, attestationsOf, merge, newProof, parseOts, parseTimestamp, sha256, TRUSTED_CALENDAR, writeOts } from "../db/ots.mjs";
import { RUNS } from "../db/replays/index.mjs";

const MAGIC = "004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294";
const file = Buffer.from("a recording\n"), digest = sha256(file);
const leaf = (...attestations) => ({ attestations, steps: [] });

test("a proof with forks and both attestation kinds survives writing and reading", () => {
  const { tree, tip, commitment } = newProof(digest, Buffer.alloc(16, 7));
  tip.steps.push({ op: "prepend", arg: Buffer.from("cafe", "hex"), next: leaf({ kind: "pending", uri: "https://alice.btc.calendar.opentimestamps.org" }) },
    { op: "append", arg: Buffer.from("beef", "hex"), next: { attestations: [{ kind: "unknown", tag: "0102030405060708", payload: Buffer.from("x") }],
      steps: [{ op: "sha256", arg: null, next: leaf({ kind: "bitcoin", height: 300 }) }] } });
  const bytes = writeOts(digest, tree);
  assert.equal(bytes.subarray(0, 31).toString("hex"), MAGIC);
  assert.ok(bytes.toString("hex").endsWith("000588960d73d71901" + "02ac02"), "height 300 is the varuint ac 02");
  const read = parseOts(bytes);
  assert.ok(read.digest.equals(digest));
  assert.deepEqual(read.tree, tree);
  assert.ok(writeOts(read.digest, read.tree).equals(bytes));

  const found = attestationsOf(digest, read.tree).map(({ kind, msg }) => [kind, msg.toString("hex")]);
  const tipMsg = sha256(Buffer.concat([digest, Buffer.alloc(16, 7)]));
  assert.ok(tipMsg.equals(commitment));
  assert.deepEqual(found, [
    ["pending", Buffer.concat([Buffer.from("cafe", "hex"), tipMsg]).toString("hex")],
    ["unknown", Buffer.concat([tipMsg, Buffer.from("beef", "hex")]).toString("hex")],
    ["bitcoin", sha256(Buffer.concat([tipMsg, Buffer.from("beef", "hex")])).toString("hex")],
  ]);
});

test("merging a calendar reply twice adds nothing the second time", () => {
  const reply = { attestations: [], steps: [{ op: "append", arg: Buffer.from("01", "hex"), next: leaf({ kind: "pending", uri: "https://b.example" }) }] };
  const into = { attestations: [], steps: [] };
  merge(into, parseTimestamp(writeOts(digest, reply).subarray(31 + 1 + 1 + 32)));
  merge(into, structuredClone(reply));
  assert.equal(into.steps.length, 1);
  assert.equal(into.steps[0].next.attestations.length, 1);
});

test("malformed or unsupported proofs are refused, not guessed at", () => {
  const good = writeOts(digest, leaf({ kind: "bitcoin", height: 1 }));
  const cases = {
    "not a proof": Buffer.from("hello"),
    "trailing byte": Buffer.concat([good, Buffer.from([0])]),
    "cut short": good.subarray(0, good.length - 1),
    "unknown step": Buffer.concat([good.subarray(0, 65), Buffer.from([0x02])]),
    "empty append": Buffer.concat([good.subarray(0, 65), Buffer.from([0xf0, 0x00, 0x00])]),
    "odd calendar URI": writeOts(digest, leaf({ kind: "pending", uri: "https://x.example/?a=<b>" })),
  };
  for (const [name, bytes] of Object.entries(cases)) assert.throws(() => parseOts(bytes), /OpenTimestamps proof/, name);
  assert.throws(() => apply({ op: "append", arg: Buffer.alloc(4097) }, digest), /too long/);
});

test("only the public calendars may be asked to upgrade a proof", () => {
  for (const uri of ["https://alice.btc.calendar.opentimestamps.org", "https://finney.calendar.eternitywall.com", "https://btc.calendar.catallaxy.com"])
    assert.match(uri, TRUSTED_CALENDAR);
  for (const uri of ["http://alice.btc.calendar.opentimestamps.org", "https://calendar.opentimestamps.org.evil.example",
    "https://evil.example/x.calendar.opentimestamps.org", "https://a.calendar.opentimestamps.org/../x"])
    assert.doesNotMatch(uri, TRUSTED_CALENDAR);
});

test("the committed proofs are written exactly as this module writes them", () => {
  for (const runId of RUNS.keys()) {
    const bytes = readFileSync(new URL(`../db/replays/${runId}.json.ots`, import.meta.url));
    const { digest: stamped, tree } = parseOts(bytes);
    assert.ok(writeOts(stamped, tree).equals(bytes), runId);
  }
});
