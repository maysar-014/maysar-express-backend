/**
 * Live verification: Phase 3 cost-model tables.
 * - CostAdjustment: create-only (immutable), attributed party queryable
 * - LedgerEntry: append-only, version refs stored
 * - FulfillmentCommitment: price lock survives re-save; status transitions
 * Run: npx tsx scripts/verify-cost-model.ts
 */
import { PrismaClient } from '@prisma/client';
import { CostAdjustment } from '../services/logistics-service/src/domain/entities/cost-adjustment.entity';
import { LedgerEntry } from '../services/logistics-service/src/domain/entities/ledger-entry.entity';
import { FulfillmentCommitment } from '../services/logistics-service/src/domain/entities/fulfillment-commitment.entity';
import { PrismaCostAdjustmentRepository, PrismaLedgerEntryRepository, PrismaFulfillmentCommitmentRepository } from '../services/logistics-service/src/infrastructure/repositories/prisma-cost-model.repository';

async function main() {
  const prisma = new PrismaClient();
  (globalThis as any).prisma = prisma;

  const jobId = `DJB_verify_${Date.now()}`;
  const adjRepo = new PrismaCostAdjustmentRepository();
  const ledgerRepo = new PrismaLedgerEntryRepository();
  const commitRepo = new PrismaFulfillmentCommitmentRepository();

  // 1. Immutable cost adjustments — two parties on the same job
  await adjRepo.save(CostAdjustment.create({
    id: `adj_v1_${Date.now()}`, deliveryJobId: jobId, adjustmentType: 'WAITING',
    amountTzs: 350, responsibleParty: 'SUPPLIER', reason: 'Supplier not ready', recordedBy: 'ops-1',
  }));
  await adjRepo.save(CostAdjustment.create({
    id: `adj_v2_${Date.now()}`, deliveryJobId: jobId, adjustmentType: 'FAILED_DELIVERY_ATTEMPT',
    amountTzs: 1500, responsibleParty: 'CUSTOMER', reason: 'Customer unreachable', recordedBy: 'ops-1',
  }));
  const adjustments = await adjRepo.findByDeliveryJobId(jobId);
  const customerAdj = await adjRepo.findByDeliveryJobIdAndParty(jobId, 'CUSTOMER');

  // 2. Append-only ledger entries with version refs
  await ledgerRepo.append(LedgerEntry.create({
    id: `led_v1_${Date.now()}`, deliveryJobId: jobId, entryType: 'BUYER_LOGISTICS_CHARGE',
    amountTzs: 13200, counterpartyId: 'buyer-1', pricingVersion: 2, tariffVersion: 1,
    routingVersion: 'routing-v3', metadata: { distanceKm: 8, durationMinutes: 25 },
  }));
  await ledgerRepo.append(LedgerEntry.create({
    id: `led_v2_${Date.now()}`, deliveryJobId: jobId, entryType: 'CARRIER_PAYABLE',
    amountTzs: -9500, counterpartyId: 'driver-1', pricingVersion: 2, tariffVersion: 1,
    metadata: { note: 'settlement amount' },
  }));
  const entries = await ledgerRepo.findByDeliveryJobId(jobId);

  // 3. Price lock — save twice with a DIFFERENT price; locked price must not change
  const cmt = FulfillmentCommitment.create({
    id: `cmt_v1_${Date.now()}`, checkoutSessionId: 'sess_verify_p3', quoteId: `qte_v_${Date.now()}`,
    buyerPriceTzs: 13200, pricingVersion: 2,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  await commitRepo.save(cmt);
  const tampered = FulfillmentCommitment.create({
    id: cmt.id, checkoutSessionId: cmt.checkoutSessionId, quoteId: cmt.quoteId,
    buyerPriceTzs: 1, pricingVersion: 2,
    lockedAt: cmt.lockedAt, expiresAt: cmt.expiresAt,
  });
  await commitRepo.save(tampered); // update branch must only touch status
  const reloaded = await commitRepo.findByQuoteId(cmt.quoteId);
  reloaded!.consume();
  await commitRepo.save(reloaded!);
  const consumed = await commitRepo.findByQuoteId(cmt.quoteId);

  console.log('adjustments:', adjustments.length, 'customer-attributed:', customerAdj.length);
  console.log('ledger entries:', entries.length, entries.map(e => `${e.entryType}:${e.amountTzs}`));
  console.log('locked price preserved:', reloaded?.buyerPriceTzs === 13200);
  console.log('commitment status after consume:', consumed?.status);

  // Cleanup
  await prisma.logistics_LedgerEntry.deleteMany({ where: { deliveryJobId: jobId } });
  await prisma.logistics_CostAdjustment.deleteMany({ where: { deliveryJobId: jobId } });
  await prisma.logistics_FulfillmentCommitment.deleteMany({ where: { id: cmt.id } });
  console.log('cleanup done');

  const ok = adjustments.length === 2 && customerAdj.length === 1
    && entries.length === 2
    && reloaded?.buyerPriceTzs === 13200
    && consumed?.status === 'CONSUMED';
  console.log(ok ? 'VERIFY: PASS' : 'VERIFY: FAIL');
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
