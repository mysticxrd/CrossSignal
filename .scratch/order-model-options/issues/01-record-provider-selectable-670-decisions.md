# 01: Record provider-selectable #670 decisions

**What to build:** Choose Gemini or Nebius for a shared public #670 request,
validate a supplied fixture response and save an immutable offline recording.
The recording identifies the requested provider/model, evidence supplied and
cited, and whether the response passed validation. No model is called.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Both provider options receive identical task, public evidence and answer schema.
- [x] Valid decisions and citations survive recording; malformed output is retained as invalid without usable decisions.
- [x] Duplicate and incomplete run directories cannot be overwritten or rerun.
- [x] CLI recordings are explicitly offline fixtures, with no invented model version, usage or charge.
- [x] The baseline order-recovery reports still match; fixture-response scoring preserves the source decisions and process checks.
- [x] npm test, lint and typecheck pass; local diff review is complete.
