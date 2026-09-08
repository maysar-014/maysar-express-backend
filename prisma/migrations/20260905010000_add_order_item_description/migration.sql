-- Additive, nullable: existing catalog orders keep NULL; request items mint the
-- free-text description they need (Maysar Request §B-1).
ALTER TABLE "order_items" ADD COLUMN "description" VARCHAR(255);
