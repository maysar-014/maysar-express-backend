/**
 * verify-settlement.ts (Phase 3 runtime wiring — live DB verification)
 *
 * Exercises the full attribution → completion-ledger → settlement path against
 * the real database:
 *   1. Records a SUPPLIER-attributed waiting adjustment + a CUSTOMER
 *      unreachable adjustment (each mirrored as a ledger ADJUSTMENT entry)
 *   2. Writes the three completion entries (buyer/carrier/maysar)
 *   3. Settles the job reading the ledger only (policy: no customer-chargeable
 *      types → the customer amount is NOT recoverable, warning emitted)
 *
 * Prints VERIFY: PASS on success; cleans up every row it created.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaCostAdjustmentRepository, PrismaLedgerEntryRepository } from '../services/logistics-service/src/infrastructure/repositories/prisma-cost-model.repository';
import { RecordCostAdjustmentUseCase } from '../services/logistics-service/src/application/use-cases/record-cost-adjustment.use-case';
import { RecordJobCompletionLedgerUseCase } from '../services/logistics-service/src/application/use-cases/record-job-completion-ledger.use-case';
import { SettleDeliveryJobUseCase } from '../services/logistics-service/src/application/use-cases/settle-delivery-job.use-case';

const JOB_ID = `DJB-VERIFY-${Date.now()}`;
const ADJUSTMENT_IDS: string[] = [];
const LEDGER_IDS: string[] = [];

async function main() {
  const prisma = new PrismaClient();
  (globalThis as any).prisma = prisma;

  try {
    const adjustmentRepo = new PrismaCostAdjustmentRepository();
    const ledgerRepo = new PrismaLedgerEntryRepository();
    const record = new RecordCostAdjustmentUseCase(adjustmentRepo, ledgerRepo);
    const complete = new RecordJobCompletionLedgerUseCase(ledgerRepo);
    const settle = new SettleDeliveryJobUseCase(ledgerRepo);

    // 1. Adjustments with attribution.
    for (const [event, amount, reason] of [
      ['SUPPLIER_NOT_READY', 800, 'seller not ready at pickup window'],
      ['CUSTOMER_UNREACHABLE', 500, 'customer unreachable at delivery'],
    ] as const) {
      const r = await record.execute({
        deliveryJobId: JOB_ID,
        event,
        amountTzs: amount,
        reason,
        recordedBy: 'verification-script',
        pricingVersion: 2,
      });
      ADJUSTMENT_IDS.push(r.adjustmentId);
      LEDGER_IDS.push(r.ledgerEntryId);
    }

    // 2. Completion ledger.
    const c = await complete.execute({
      deliveryJobId: JOB_ID,
      buyerPriceTzs: 6000,
      actualFulfillmentCostTzs: 4500,
      plannedFulfillmentCostTzs: 5000,
      driverCompensationTzs: 2500,
      buyerId: 'buy-verify',
      driverId: 'drv-verify',
      pricingVersion: 2,
      tariffVersion: 3,
      routingVersion: 'route-v1',
    });
    LEDGER_IDS.push(c.buyerChargeEntryId, c.carrierPayableEntryId, c.maysarRevenueEntryId);
    if (c.consolidationSavingEntryId) LEDGER_IDS.push(c.consolidationSavingEntryId);

    // 3. Settlement — ledger only.
    const result = await settle.execute({
      deliveryJobId: JOB_ID,
      variancePolicy: { maysarAbsorbsUpToTzs: 0, customerChargeableVarianceTypes: [] },
    });

    const ok =
      result.driverPayableTzs === 2500 &&
      result.buyerChargeTzs === 6000 &&
      result.supplierDeductionsTzs === 800 &&
      result.customerRecoverableTzs === 0 &&
      result.adjustmentsApplied === 2 &&
      c.maysarRevenueTzs === 1500;

    console.log('=== SETTLEMENT VERIFICATION ===');
    console.log(JSON.stringify(result, null, 2));
    console.log(ok ? 'VERIFY: PASS' : 'VERIFY: FAIL');
  } finally {
    // Cleanup every row this script created.
    for (const id of ADJUSTMENT_IDS) {
      try { await prisma.logistics_CostAdjustment.delete({ where: { id } }); } catch { /* ignore */ }
    }
    for (const id of LEDGER_IDS) {
      try { await prisma.logistics_LedgerEntry.delete({ where: { id } }); } catch { /* ignore */ }
    }
    await prisma.$disconnect();
  }
}

void main();