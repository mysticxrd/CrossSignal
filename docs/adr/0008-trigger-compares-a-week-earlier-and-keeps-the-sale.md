# The trigger compares the trailing day with the same day a week earlier, keeps the sale week, and fixes each case's "now"

A dip is store revenue over the trailing 24 h at least 25% below the same 24 h exactly 7 days earlier. Code checks it hourly on the case clock, and the first hour it crosses becomes the case's frozen "now"; no case's "now" is chosen by hand. The trigger never skips the merchant's sale week, though the watch does. We chose this because the baseline world is five weeks of a store growing into December. Measured on GA4's daily data, a 3-week same-weekday average fires on none of the 14 days that can be "now": the average lags the growth, so no-cause cases could only be injected, which would make them hand-picked. A one-week comparison needs one prior week, so 28 days can be "now", and it fires on 6 of them (21%), four of them in the sale's shadow. That is the false alarm a naive merchant tool raises and the agent, which reads the sale calendar, should answer with "no cause". Neither Razorpay nor WooCommerce sends a revenue-dip alert, so the trigger is CrossSignal's own and every screen says so.

## Considered options

- **A 3-week same-weekday average** (section 2's assumption): robust in production, but in this world it never fires on normal rhythm.
- **A 3-week median**: one natural crossing.
- **Skipping the sale week in the trigger too**: removes 4 of the 6 natural windows, among them the post-sale proof case, and takes the trap out of the demo.
- **A daily check**: up to a day late against a webhook disabled after 24 h.

## Consequences

- Trigger settings decide which cases exist and when "now" is, so changing them is a world-version change, never a harness rung.
- The watch keeps its own robust baseline (the 3-week average that skips the sale), since a one-week comparison would wrongly reopen a correct post-sale "no cause".
- Every injected cause must push the trailing 24 h past the threshold, or it can't be a case.
- The 6 natural windows are public by construction: anyone can recompute where the trigger fires. Development and held-out no-cause cases use disjoint windows, and the README says so.
- A real merchant would see about 1.5 false alarms a week. The trigger therefore messages no one: the merchant hears only when a run's answer is ready.
