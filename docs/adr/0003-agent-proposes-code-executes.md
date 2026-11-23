# The agent has no write tools: it ends with one proposal that code executes after approval

The E1 agent reads records and may wait, but it cannot change the world. Its run ends with one proposal: the cause, the records it cites, and a typed list of effects. Code hashes the proposal. An approval record binds that hash, an executor checks every effect against the world's mechanics (the payment is still authorized and inside its capture window, the order is still failed, the webhook is still disabled), and then the executor applies all of the effects or none of them. We chose this because "no write without an approval record" then holds by construction rather than by the model's restraint. One proposal is also one object to grade, price, approve and replay. And it matches A01's hash-bound approval, which already works.

## Considered options

- **Write tools the agent calls itself after approval** (`capture_payment` and the rest, as Razorpay's MCP server offers): closer to how an MCP agent works, but approval becomes a turn inside the conversation, a write can happen between approval and the record, and the grader would have to rebuild intent from scattered calls.
- **Write tools gated per call by an approval check**: safe, but every write becomes its own approval, which section 2 priced as a cost-1 ask, and the merchant would approve a stream of calls instead of one priced fix.

## Consequences

- The executor checks only the world's mechanics. Judgement checks (a write outside the affected set, a wrong capture) belong to the grader, because the executor cannot know the answer key.
- The kind of action is derived by code from the effects, so the agent never labels its own action.
- A later Razorpay test-mode run swaps the executor's backend and leaves the agent unchanged.
