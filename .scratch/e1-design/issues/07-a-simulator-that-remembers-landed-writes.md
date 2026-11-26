# 07: A simulator that remembers landed writes

**What to build:** The backend interface sits between tools and the simulator. The simulator saves each landed write to its own per-run journal before it replies, and a restarted simulator rebuilds its world from seed plus journal (Fix F1), so a crash or lost acknowledgement behaves as it would against Razorpay.

**Blocked by:** 03: A GA4 world with 7 real future days

**Status:** done

- [x] Kill the process after the journal write and before the reply: the restarted world holds the write.
- [x] A torn last journal line is cut and recorded.
- [x] The run log is not read to rebuild the world.
- [x] `npm test` and `npm run lint` pass.
