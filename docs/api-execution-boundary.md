---
type: proposed-api-boundary
status: provider-and-spend-selection-pending
source_date: 2026-09-30
paid_calls_authorized: false
---

# API execution boundary

The user selected AI through APIs and removed the local-model requirement.
This run needs a thin provider adapter, not a local inference installation.
Provider/model selection and any permitted paid spend remain open. The original
zero-paid-call constraint still applies until an explicit budget supersedes it.
Preparation requires no API call, credential inspection or installation.

## Before the first model request

Record the chosen provider and official endpoint, pinned model ID/version,
supported structured output/tool format, context/output limits, reasoning and
sampling controls, seed availability, token/charge reporting and retry behavior.
Verify these against that provider's current official documentation. No provider
is assumed compatible with every OpenAI-style parameter.

Bind an explicit spend ceiling and account scope. With a $0 cap, use only a
verified free allocation that cannot silently fall back to paid billing; if
this cannot be established, do not run. With a later nonzero approved cap,
record pricing/date, include smoke tests and both experiment rounds in the
budget, reserve worst-case request cost before dispatch, and stop before the
next request if the cap cannot cover it. Unknown usage/charges cannot justify
additional paid calls. API subscription availability is not proof of API credit.

The proposed main schedule is 35 initial artifacts plus 15 changed-investigator
artifacts. That includes five no-model deterministic runs. Initial model work
is 15 single-shot requests and up to 180 tool-model requests; the second round
adds at most 180 tool-model requests. Smoke requests and any retries are separate
but count toward the same approved ceiling. These are upper bounds, not a cost
forecast. Token/price estimates must use the chosen provider's actual contract.

Use concurrency one, recorded request IDs, terminal failure records, explicit
timeouts and disabled automatic retry by default. Timeouts/rate limits stay
visible; never blindly retry a potentially billable request. Tool attempts and
malformed model outputs remain in the score denominator.

## Transport and disclosure

Only the trusted host possesses credentials. Read the chosen key from a scoped
secret source at execution time; record key presence/source name only. Never
write credentials, auth headers, account identifiers or unrestricted environment
variables to prompts, transcripts, gates or Git. The model cannot choose provider,
endpoint, identity, policy, approval provenance or destination URLs.

Send only synthetic, pre-cutoff observable evidence and permitted task/tool
schemas. No project upload, real customer data, old TEST receipt, evaluator
report, private world state or factory source document belongs in the API input.
Disable provider-native web search, code execution, file retrieval and remote
MCP. Query outputs return to the host for validation before further model input.

Record the sanitized API request and visible answer/tool-call response, usage,
provider request ID, model/fingerprint, timestamps and errors. Disable extended
reasoning where supported; exclude hidden reasoning channels from saved artifacts.
If reasoning tokens are billed, retain counts/cost separately without their text.
Maintain the current append-only Case history and one-time exact effect boundary.

## Retained initial hardware inspection

The initial request asked for local-model feasibility; this was completed before
the correction. Windows 11 Home x64; Core Ultra 5 125U (12 cores/14 logical CPUs);
15.43 GiB RAM; approximately 1.5 GiB free at inspection; Intel integrated graphics;
approximately 179 GiB free disk. Reported adapter memory is not verified dedicated
VRAM. Node v22.15.0 and Python 3.13.3 are available.

No inference CLI was found on inspected Windows PATH, common caches or installation
locations; common local model ports refused connections. The Qwen directory was
present but returned no entries; a Qwen desktop installer exists in Downloads.
Neither is proof of usable local model weights. Registered WSL2 Ubuntu has Python
3.12.3; inspected local inference commands, common model caches and relevant Python
packages were absent. These were bounded checks, not a whole-disk search. Ubuntu
was initially stopped and was started to run the read-only inventory.

No model was installed, downloaded or invoked. These observations are historical
background only: RAM/GPU fit does not gate the API benchmark. Raw command evidence
is retained in the review packet's `evidence/session-inspection.json`.
