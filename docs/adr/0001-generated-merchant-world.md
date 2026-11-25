# The merchant world is fully generated, pinned, and speaks Razorpay's API shapes

E1's merchant world takes only its daily counts and funnel from the real GA4 merch-store data; everything about money (payments, refunds, webhooks, settlements, plugin versions, deploys, messages) comes from a seeded generator that follows Razorpay's documented payment lifecycle and serves responses in Razorpay's and WooCommerce's real API shapes, behind the network boundary the agent's tools call. Each world version is pinned and hashed, and each case's answer key is written from its injection and must pass a counterfactual check (remove the cause and the dip goes; remove the decoy and the dip stays) before any model run. We chose this because the eval is the demo: the answer key must never depend on a model, and the people judging it know Razorpay's mechanics better than anything else.

## Considered options

- **Hand-written order worlds, as for #670 and #664**: too small to need an agent.
- **A fully synthetic generator, rhythm included**: loses the one real source of noise that makes no-cause dips honest.
- **An LLM world simulator that answers queries the fixtures don't cover** (the "Swiss cheese" hybrid from Raindrop's simulation talk): rejected, because a generated world already answers every query, and an LLM inventing state would make runs non-deterministic and let the simulator grade itself.

## Consequences

- Tool responses carry no simulation markers; the "simulated" label lives in the README, run log and replay.
- Changing the generator starts a new world version, and harness comparisons across versions are void.
- Because tools speak Razorpay's shapes, the same tools can later run against Razorpay test mode.
