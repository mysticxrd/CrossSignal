---
type: verification-record
stage: 03_build
unit: fixture-runtime-source-of-truth-correction
status: passed
---

# L20 Stage 03 verification record

Run `node factory/03_build/verify.mjs` from the repository root.

The verifier fails closed on:

- drift in the accepted Stage 02 package/gate or either shared reference;
- drift in any of the eight durable Stage 03 outputs;
- an unaccepted Stage 02 gate;
- any failing import, projection, reset, or seal-transition case;
- a product/archive or durable-test/numbered-fixture dependency;
- more than one durable graph registry definition;
- a remaining stage-numbered public export;
- loss of any of the fourteen durable L06 database-attack cases;
- any failure in the 66-test durable Flight Recorder suite;
- focused lint failure; or
- a missing, stale, or prematurely closed Stage 03 human gate.

Expected passing summary:

```text
Stage 03 build verification passed.
Bound inputs: 5
Bound durable outputs: 8
Stage 02 cases: 16
Durable product tests: 66 passed
Graph authority definitions: 1
```

The production build is separately recorded in `BUILD_EVIDENCE.md` because its
Vite cache writes depend on the installed workspace dependency location. The
verifier itself remains deterministic and read-only apart from isolated test
databases created by the product suite.
