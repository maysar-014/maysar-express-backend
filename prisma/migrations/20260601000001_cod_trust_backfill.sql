-- COD Trust Backfill
-- Populates lifetimeCODValue and activeExposure from historical order data.
-- Safe to run multiple times (idempotent — always recomputes from source).

-- Step 1: lifetimeCODValue = sum of delivered COD orders per buyer
UPDATE order_cod_trust_scores ts
SET "lifetimeCODValue" = COALESCE(sub.total, 0)
FROM (
  SELECT
    o."buyerId",
    SUM(CAST(o."totalAmount" AS BIGINT)) AS total
  FROM orders o
  WHERE o."paymentMethod" = 'COD'
    AND o.status = 'DELIVERED'
  GROUP BY o."buyerId"
) sub
WHERE ts."buyerId" = sub."buyerId";

-- Step 2: activeExposure = sum of active (non-terminal) COD orders per buyer
UPDATE order_cod_trust_scores ts
SET "activeExposure" = COALESCE(sub.total, 0)
FROM (
  SELECT
    o."buyerId",
    SUM(CAST(o."totalAmount" AS BIGINT)) AS total
  FROM orders o
  WHERE o."paymentMethod" = 'COD'
    AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'REFUNDED')
  GROUP BY o."buyerId"
) sub
WHERE ts."buyerId" = sub."buyerId";

-- Verify
SELECT
  COUNT(*) AS total_buyers,
  SUM("lifetimeCODValue") AS total_lifetime_tzs,
  SUM("activeExposure") AS total_active_exposure_tzs
FROM order_cod_trust_scores;
