# L08 active-intent authority correction release

This directory preserves the complete governed factory run sealed at commit
`464df6be405307f4412894e0d24d1569bf3036b6` on branch
`codex/l08-authority-race`.

The release corrects only finding L08: authorization and external effects are
bound atomically to the trace's exact active intent. Findings L06, L20, L04,
and L14 remain open for separate governed runs.

The archive contains every run-specific stage contract, verifier, fixture, and
output from `01_spec` through `05_ship`, plus the run's root factory contract as
`FACTORY_CONTEXT.md`.
