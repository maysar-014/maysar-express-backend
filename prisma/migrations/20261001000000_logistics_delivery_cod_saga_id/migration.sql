-- BLG-024 / BLG-027 — COD confirmation saga correlation.
--
-- COD verification (`POST /cod/:deliveryId/verify`) is a separate HTTP request
-- from OTP generation (`POST /cod/:deliveryId/otp`), so the saga that was
-- started for initiation cannot be held in memory. `VerifyCODDeliveryUseCase`
-- had no way to reach it and instead called `start()` again, which restarts a
-- saga from step 0 — re-minting the OTP and overwriting the one the courier was
-- holding, so the submitted code could never validate.
--
-- Storing the saga id on the delivery row keeps the initiation saga
-- auditable and correlatable from the later verification request.
--
-- Note on resumption: verification does NOT re-enter this saga. COD was split
-- into `CODInitiationSaga` (OTP issuance) and `CODSettlementSaga` (verification
-- + settlement) so that settlement is unreachable before a courier verifies the
-- delivery — resuming the old combined saga is precisely what re-ran settlement
-- at OTP-generation time (BLG-027). The id is therefore recorded for tracing,
-- not for resuming.
--
-- Nullable and additive: deliveries that predate this change, and non-COD
-- deliveries, are unaffected and simply have no saga to resume.
ALTER TABLE "logistics_deliveries" ADD COLUMN IF NOT EXISTS "codSagaId" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "logistics_deliveries_codSagaId_idx" ON "logistics_deliveries"("codSagaId");
