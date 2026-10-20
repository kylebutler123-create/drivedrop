-- Read-only regression check against the deployed constraint, not a copied predicate.
-- Every returned row must have passed=true; no application record is changed.
WITH cases(label, status, applied, code, active, refund, expected) AS (VALUES
 ('pending', 'PENDING', false, NULL, 'pay', NULL, true),
 ('initial failure', 'FAILED', false, NULL, 'pay', 're_test', true),
 ('ordinary review', 'REVIEW', false, 'REFUND_REVIEW', 'pay', NULL, true),
 ('confirmed', 'SUCCEEDED', true, NULL, NULL, 're_test', true),
 ('confirmed without ledger', 'SUCCEEDED', false, NULL, NULL, 're_test', false),
 ('confirmed without Stripe ID', 'SUCCEEDED', true, NULL, NULL, NULL, false),
 ('pending with ledger', 'PENDING', true, NULL, 'pay', 're_test', false),
 ('failed with unexplained ledger', 'FAILED', true, NULL, 'pay', 're_test', false),
 ('review with unexplained ledger', 'REVIEW', true, NULL, 'pay', 're_test', false),
 ('corrected late failure', 'FAILED', true, 'STRIPE_REFUND_FAILED_AFTER_SUCCESS', 'pay', 're_test', true),
 ('late failure review', 'REVIEW', true, 'LATE_REFUND_FAILURE_REVIEW', 'pay', 're_test', true),
 ('late failure without hold', 'FAILED', true, 'STRIPE_REFUND_FAILED_AFTER_SUCCESS', NULL, 're_test', false),
 ('late review without hold', 'REVIEW', true, 'LATE_REFUND_FAILURE_REVIEW', NULL, 're_test', false),
 ('late failure wrong payment hold', 'FAILED', true, 'STRIPE_REFUND_FAILED_AFTER_SUCCESS', 'other', 're_test', false),
 ('late failure without prior ledger', 'FAILED', false, 'STRIPE_REFUND_FAILED_AFTER_SUCCESS', 'pay', 're_test', false),
 ('late review without prior ledger', 'REVIEW', false, 'LATE_REFUND_FAILURE_REVIEW', 'pay', 're_test', false),
 ('late failure without Stripe ID', 'FAILED', true, 'STRIPE_REFUND_FAILED_AFTER_SUCCESS', 'pay', NULL, false),
 ('success cannot retain failure marker', 'SUCCEEDED', true, 'STRIPE_REFUND_FAILED_AFTER_SUCCESS', NULL, 're_test', false),
 ('failure cannot use review marker', 'FAILED', true, 'LATE_REFUND_FAILURE_REVIEW', 'pay', 're_test', false)
), definition AS (
 SELECT pg_get_expr(conbin, conrelid) AS predicate
 FROM pg_constraint
 WHERE conrelid='public."StripeRefund"'::regclass AND conname='StripeRefund_success_check'
), checked AS (
 SELECT label, expected,
  (xpath('//result/text()', query_to_xml(format(
   'SELECT (%s) IS NOT FALSE AS result FROM (VALUES (%L::text,%L::timestamp,%L::text,%L::text,%L::text,%L::text)) AS t("status","ledgerAppliedAt","failureCode","activePaymentId","stripeRefundId","paymentId")',
   predicate, status, CASE WHEN applied THEN '2026-10-20 00:00:00' END, code, active, refund, 'pay'
  ), true, false, '')))[1]::text::boolean AS actual
 FROM cases CROSS JOIN definition
)
SELECT label, expected, actual, actual=expected AS passed FROM checked ORDER BY label;
