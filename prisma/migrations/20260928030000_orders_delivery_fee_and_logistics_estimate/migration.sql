-- Order delivery fee and logistics estimate.
--
-- `POST /orders` has always accepted `deliveryFee` and `logisticsEstimate`, and
-- `BuyerConfirmCheckoutUseCase` reads them off the order to compute the COD
-- commitment (the wallet hold taken before packaging). Neither field existed on
-- the order record, so the value read back was always 0:
--
--   calculateCommitmentFee(0, 0) -> 0  ->  `if (codCommitmentFee > 0)` false
--
-- and the commitment hold was NEVER placed. COD orders were confirmed with no
-- funds held, leaving the platform unsecured against delivery refusal.
--
-- Stored in minor units (same convention as `totalAmount`/`totalWeight`), and
-- nullable so existing rows are not backfilled with a fabricated fee.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryFee" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "logisticsEstimate" INTEGER;
