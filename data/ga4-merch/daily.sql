-- W1 real-data baseline: one row per day, device and traffic medium for the GA4 Google Merchandise Store
-- obfuscated sample (2020-11-01 to 2021-01-31). Run it once in the BigQuery console (the free sandbox is enough;
-- it scans a few GB of the 1 TB monthly allowance), then Save results -> CSV (local file) and save the file as
-- data/ga4-merch/daily.csv. The W1 case generator reads only that CSV.
--
-- A session is user_pseudo_id + ga_session_id, dated by its first event. user_medium is the user's first-touch
-- medium (traffic_source); session_medium is the first medium event parameter seen in the session, when the
-- sample has one. The profile (node scripts/profile-ga4.mjs) decides which one becomes the case segments.
WITH events AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS day,
    user_pseudo_id,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS session_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'medium') AS event_medium,
    device.category AS device,
    traffic_source.medium AS user_medium,
    event_name,
    event_timestamp,
    ecommerce.transaction_id,
    ecommerce.purchase_revenue_in_usd
  FROM `bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20201101' AND '20210131'
),
sessions AS (
  SELECT
    user_pseudo_id,
    session_id,
    MIN(day) AS day,
    ANY_VALUE(device) AS device,
    ANY_VALUE(user_medium) AS user_medium,
    ARRAY_AGG(event_medium IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS session_medium,
    LOGICAL_OR(event_name = 'view_item') AS viewed_item,
    LOGICAL_OR(event_name = 'add_to_cart') AS added_to_cart,
    LOGICAL_OR(event_name = 'begin_checkout') AS began_checkout,
    LOGICAL_OR(event_name = 'add_payment_info') AS added_payment_info,
    COUNTIF(event_name = 'purchase') AS purchase_events,
    COUNT(DISTINCT IF(event_name = 'purchase', transaction_id, NULL)) AS transaction_ids,
    SUM(IF(event_name = 'purchase', purchase_revenue_in_usd, 0)) AS revenue_usd
  FROM events
  WHERE session_id IS NOT NULL
  GROUP BY user_pseudo_id, session_id
)
SELECT
  day,
  IFNULL(device, '(null)') AS device,
  IFNULL(user_medium, '(null)') AS user_medium,
  IFNULL(session_medium, '(null)') AS session_medium,
  COUNT(*) AS sessions,
  COUNT(DISTINCT user_pseudo_id) AS users,
  COUNTIF(viewed_item) AS sessions_view_item,
  COUNTIF(added_to_cart) AS sessions_add_to_cart,
  COUNTIF(began_checkout) AS sessions_begin_checkout,
  COUNTIF(added_payment_info) AS sessions_add_payment_info,
  COUNTIF(purchase_events > 0) AS sessions_purchase,
  SUM(purchase_events) AS purchase_events,
  SUM(transaction_ids) AS transaction_ids,
  ROUND(SUM(revenue_usd), 2) AS revenue_usd
FROM sessions
GROUP BY day, device, user_medium, session_medium
ORDER BY day, device, user_medium, session_medium
