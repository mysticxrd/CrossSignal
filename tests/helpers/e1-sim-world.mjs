import { buildWorld, worldHash } from '../../e1/world.mjs';

// A baseline world with one payment authorized but not captured: a stand-in for ticket 05's late-authorization
// cause, so the simulator has something to capture. The hash is recomputed, as a cause's builder will do.
export function authorizedWorld(seed = 'sim-test', index = 0) {
  const world = buildWorld({ seed });
  const payment = world.orders[index].payment;
  payment.status = 'authorized';
  delete payment.captured_at;
  world.hash = worldHash(world.version, world.seed, world.orders);
  return { world, payment };
}
