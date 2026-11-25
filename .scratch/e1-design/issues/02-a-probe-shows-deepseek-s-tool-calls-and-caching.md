# 02: A probe shows DeepSeek's tool calls and caching

**What to build:** A probe script prints its requests offline with `--prepare`, and on the owner's word (with zero data retention on) sends about $0.05 of requests that show what section 9 decision 2 lists: the model id and prices, strict tool calls, `tool_choice: required`, several calls in one turn, `reasoning_content` across turns, cached tokens on a repeated prefix, and usage fields. The result is written into this ticket.

**Blocked by:** 01: The E1 provider settles with cached tokens

**Status:** ready-for-agent

- [ ] `--prepare` writes a request snapshot that a test compares.
- [ ] The paid send waits for the owner's word and zero data retention on.
- [ ] Findings (pass or fallback to a JSON next action) are recorded here.
- [ ] `npm test` and `npm run lint` pass.
