-- Phase 4 §4.1: buyer's delivery-window preference on the checkout session.
ALTER TABLE "Checkout_CheckoutSession"
  ADD COLUMN "deliveryWindowPreference" VARCHAR(16);