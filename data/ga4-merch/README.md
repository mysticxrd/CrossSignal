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
