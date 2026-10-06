# GA4 Merchandise Store baseline

Source: the Google Analytics 4 sample ecommerce dataset for the Google
Merchandise Store, `bigquery-public-data.ga4_obfuscated_sample_ecommerce`,
2020-11-01 to 2021-01-31. Google documents it, under CC BY 4.0, at
https://developers.google.com/analytics/bigquery/web-ecommerce-demo-dataset.
The data is obfuscated: some fields hold placeholders such as `<Other>`, and its
internal consistency is limited.

`daily.sql`, run once in the BigQuery console, produces `daily.csv`: one row per
day, device and traffic medium. The W1 cases use it as a real baseline with
injected, labelled incidents. Their engineering and support events are synthetic.

What the profile (`node scripts/profile-ga4.mjs`) found, exported 2026-10-06:

- 92 days, 6,316 rows, 360,129 sessions, 4,848 purchasing sessions, $362,165.
- Case segments are the three device categories (desktop, mobile, tablet), so a
  case's rows add up to the whole store. The traffic medium fields are not used:
  the placeholders `<Other>` and `(data deleted)` hold 21% of sessions by user
  medium, and `(none)` another 23%.
- Revenue is unusable from 2021-01-26: orders continue but revenue falls to
  nearly zero. Cases stop at 2021-01-25.
- 2020-12-19 to 2021-01-04 is the Christmas slump, when checkouts fall by about
  80%. No case window crosses it.
- Even untouched, a device's weekly conversion or order value often moves 15-25%, and
  Saturday and Sunday revenue runs at 50-75% of the daily mean.
