/**
 * RecordJobCompletionLedgerUseCase (Phase 3 §3.3 + §3.4)
 *
 * Called when a DeliveryJob completes. Writes the append-only ledger entries
 * that settlement and every future audit will read — amounts are NEVER
 * re-derived downstream:
 *
 *   BUYER_LOGISTICS_CHARGE   what the buyer actually paid (the locked
 *                            commitment price — never a re-quote)
 *   CARRIER_PAYABLE          what the driver receives
 *   MAYSAR_LOGISTICS_REVENUE buyer charge − actual fulfillment cost
 *   CONSOLIDATION_SAVING     when post-confirmation optimization made the
 *                            fulfillment cheaper than the plan the price was
 *                            locked against — attributed to MAYSAR's benefit,
 *                            never returned to the buyer as a surprise credit
 *                            (§3.4, rule 6)
 *
 * All entries carry pricingVersion / tariffVersion / routingVersion so any
 * historical transaction can be reproduced exactly (rule 4).
 */

import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';
import { LedgerEntryRepository } from '../../domain/repositories/cost-model.repository';
import { makeId } from '../../../../../shared/ids/id';

export interface JobCompletionLedgerRequest {
  deliveryJobId: string;
  shipmentId?: string | null;
  /** What the buyer paid — the locked price (rule 6). */
  buyerPriceTzs: number;
  /** Actual post-optimization fulfillment cost (driver + operations). */
  actualFulfillmentCostTzs: number;
  /** Driver compensation for this job. */
  driverCompensationTzs: number;
  /** Fulfillment cost the locked price was planned against (pre-optimization). */
  plannedFulfillmentCostTzs?: number;
  buyerId: string;
  driverId: string;
  pricingVersion: number;
  tariffVersion?: number | null;
  routingVersion?: string | null;
}

export interface JobCompletionLedgerResult {
  buyerChargeEntryId: string;
  carrierPayableEntryId: string;
  maysarRevenueEntryId: string;
  consolidationSavingEntryId: string | null;
  consolidationSavingTzs: number;
  maysarRevenueTzs: number;
}

export class RecordJobCompletionLedgerUseCase {
  constructor(private readonly ledgerRepo: LedgerEntryRepository) {}

  async execute(request: JobCompletionLedgerRequest): Promise<JobCompletionLedgerResult> {
    const { deliveryJobId } = request;
    const buyerPrice = request.buyerPriceTzs;
    const actualCost = request.actualFulfillmentCostTzs;
    const driverPayable = request.driverCompensationTzs;

    if (buyerPrice <= 0) throw new Error('Ledger rejected: buyerPriceTzs must be positive');
    if (driverPayable < 0) throw new Error('Ledger rejected: driverCompensationTzs cannot be negative');
    if (actualCost < driverPayable) {
      throw new Error('Ledger rejected: actualFulfillmentCostTzs cannot be below driverCompensationTzs');
    }

    const versionRefs = {
      pricingVersion: request.pricingVersion,
      tariffVersion: request.tariffVersion ?? null,
      routingVersion: request.routingVersion ?? null,
    };
    const calculatedAt = new Date();

    // 1. Buyer charge — the locked price, exactly what the buyer paid.
    const buyerEntry = LedgerEntry.create({
      id: makeId('lge'),
      deliveryJobId,
      shipmentId: request.shipmentId ?? null,
      entryType: 'BUYER_LOGISTICS_CHARGE',
      amountTzs: buyerPrice, // positive: income from the buyer
      counterpartyId: request.buyerId,
      metadata: { role: 'buyer', lockedPrice: true },
      calculatedAt,
      ...versionRefs,
    });

    // 2. Carrier payable — what the driver receives.
    const carrierEntry = LedgerEntry.create({
      id: makeId('lge'),
      deliveryJobId,
      shipmentId: request.shipmentId ?? null,
      entryType: 'CARRIER_PAYABLE',
      amountTzs: -driverPayable, // negative: payable out to the driver
      counterpartyId: request.driverId,
      metadata: { role: 'driver' },
      calculatedAt,
      ...versionRefs,
    });

    // 3. Maysar revenue — realized margin after optimization.
    const maysarRevenue = buyerPrice - actualCost;
    if (maysarRevenue < 0) {
      throw new Error(
        `Ledger rejected: buyer price ${buyerPrice} does not cover actual cost ${actualCost} — Maysar would subsidize a loss (Maysar margin ≥ 0)`,
      );
    }
    const revenueEntry = LedgerEntry.create({
      id: makeId('lge'),
      deliveryJobId,
      shipmentId: request.shipmentId ?? null,
      entryType: 'MAYSAR_LOGISTICS_REVENUE',
      amountTzs: maysarRevenue,
      counterpartyId: 'MAYSAR',
      metadata: { role: 'platform', actualFulfillmentCostTzs: actualCost },
      calculatedAt,
      ...versionRefs,
    });

    await this.ledgerRepo.append(buyerEntry);
    await this.ledgerRepo.append(carrierEntry);
    await this.ledgerRepo.append(revenueEntry);

    // 4. Consolidation saving — post-confirmation optimization benefit (§3.4).
    let savingEntryId: string | null = null;
    let savingTzs = 0;
    if (request.plannedFulfillmentCostTzs != null && actualCost < request.plannedFulfillmentCostTzs) {
      savingTzs = request.plannedFulfillmentCostTzs - actualCost;
      const savingEntry = LedgerEntry.create({
        id: makeId('lge'),
        deliveryJobId,
        shipmentId: request.shipmentId ?? null,
        entryType: 'CONSOLIDATION_SAVING',
        amountTzs: savingTzs, // positive: benefit to Maysar
        counterpartyId: 'MAYSAR',
        metadata: {
          role: 'platform',
          plannedFulfillmentCostTzs: request.plannedFulfillmentCostTzs,
          actualFulfillmentCostTzs: actualCost,
          postConfirmationOptimization: true,
          buyerPriceUnchanged: buyerPrice,
        },
        calculatedAt,
        ...versionRefs,
      });
      await this.ledgerRepo.append(savingEntry);
      savingEntryId = savingEntry.id;
    }

    return {
      buyerChargeEntryId: buyerEntry.id,
      carrierPayableEntryId: carrierEntry.id,
      maysarRevenueEntryId: revenueEntry.id,
      consolidationSavingEntryId: savingEntryId,
      consolidationSavingTzs: savingTzs,
      maysarRevenueTzs: maysarRevenue,
    };
  }
}

