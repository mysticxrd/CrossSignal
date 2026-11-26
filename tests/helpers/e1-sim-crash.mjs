// Captures the authorized payment, then stops dead once the journal line is on disk and before the reply: it says
// `journaled` on stdout and blocks until the test kills it. `replied` means the kill came too late.
import { writeSync } from 'node:fs';
import { openSimulator } from '../../e1/simulator.mjs';
import { authorizedWorld } from './e1-sim-world.mjs';

const { world, payment } = authorizedWorld();
const sim = openSimulator({
  world, journal: process.argv[2], clock: () => Number(process.argv[3]),
  onJournaled: () => { writeSync(1, 'journaled\n'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20_000); },
});
const reply = await sim.backend.capturePayment({ payment_id: payment.id, amount_paise: payment.amount_paise });
writeSync(1, `replied ${reply.http}\n`);
