/**
 * SettleDeliveryJobUseCase (Phase 3 §3.2 + §3.3)
 *
 * Settles a completed DeliveryJob by reading THE LEDGER ONLY — it never
 * re-derives amounts from current config (rule 7). Steps:
 *
 *   1. Load the job's ledger entries (buyer charge, carrier payable, maysar
 *      revenue, consolidation savings).
 *   2. Load ADJUSTMENT entries, which mirror the §3.2-attributed
 *      Logistics_CostAdjustments (responsibleParty in metadata) — policy is
 *      applied from the versioned CostVariancePolicy config:
 *        CUSTOMER → recovered only if customerChargeableVarianceTypes covers
 *                   it (never without explicit policy coverage)
 *        MAYSAR   → absorbed by Maysar (reduces Maysar revenue)
 *        SUPPLIER → deducted from the supplier's settlement
 *   3. Return disbursements: driver payable, Maysar revenue (after absorbing
 *      Maysar-attributed costs), supplier deductions, customer recoverables.
 *
 * All ledger reads are append-only data; this use-case performs no writes.
 */

import { LedgerEntryRepository } from '../../domain/repositories/cost-model.repository';
import { CostVariancePolicy } from '../../domain/value-objects/optimization-config.value-object';

export interface SettleDeliveryJobRequest {
  deliveryJobId: string;
  variancePolicy: CostVariancePolicy;
}

export interface SettlementResult {
  deliveryJobId: string;
  driverPayableTzs: number;
  buyerChargeTzs: number;
  supplierDeductionsTzs: number;
  customerRecoverableTzs: number;
  maysarRevenueTzs: number;
  consolidationSavingsTzs: number;
  adjustmentsApplied: number;
  warnings: string[];
}

export class SettleDeliveryJobUseCase {
  constructor(private readonly ledgerRepo: LedgerEntryRepository) {}

  async execute(request: SettleDeliveryJobRequest): Promise<SettlementResult> {
    const entries = await this.ledgerRepo.findByDeliveryJobId(request.deliveryJobId);
    if (!entries.length) {
      throw new Error(`Settlement rejected: no ledger entries exist for job ${request.deliveryJobId}`);
    }

    const buyerCharge = entries
      .filter(e => e.entryType === 'BUYER_LOGISTICS_CHARGE')
      .reduce((sum, e) => sum + e.amountTzs, 0);

    const driverPayable = Math.abs(
      entries
        .filter(e => e.entryType === 'CARRIER_PAYABLE')
        .reduce((sum, e) => sum + e.amountTzs, 0),
    );

    const maysarRevenueBase =
      entries
        .filter(e => e.entryType === 'MAYSAR_LOGISTICS_REVENUE')
        .reduce((sum, e) => sum + e.amountTzs, 0);

    const consolidationSavings =
      entries
        .filter(e => e.entryType === 'CONSOLIDATION_SAVING')
        .reduce((sum, e) => sum + e.amountTzs, 0);

    const adjustmentEntries = entries.filter(e => e.entryType === 'ADJUSTMENT');
    let supplierDeductionsTzs = 0;
    let customerRecoverableTzs = 0;
    let maysarAbsorbedTzs = 0;
    const warnings: string[] = [];

    const chargeable = new Set(request.variancePolicy.customerChargeableVarianceTypes);
    for (const entry of adjustmentEntries) {
      const party = String(entry.metadata.responsibleParty ?? '');
      const type = String(entry.metadata.adjustmentType ?? '');
      const amount = entry.amountTzs;
      switch (party) {
        case 'SUPPLIER':
          supplierDeductionsTzs += amount;
          break;
        case 'MAYSAR':
          maysarAbsorbedTzs += amount;
          break;
        case 'CUSTOMER':
          if (chargeable.has(type)) {
            customerRecoverableTzs += amount;
          } else {
            warnings.push(
              `Customer-attributed ${type} (${amount} TZS) not covered by CostVariancePolicy — not charged to buyer`,
            );
          }
          break;
        default:
          warnings.push(`Adjustment entry ${entry.id} (${party}/${type}) has no settlement treatment — flagged`);
      }
    }

    const maysarRevenueTzs = maysarRevenueBase - maysarAbsorbedTzs;

    return {
      deliveryJobId: request.deliveryJobId,
      driverPayableTzs: driverPayable,
      buyerChargeTzs: buyerCharge,
      supplierDeductionsTzs: supplierDeductionsTzs,
      customerRecoverableTzs: customerRecoverableTzs,
      maysarRevenueTzs: maysarRevenueTzs,
      consolidationSavingsTzs: consolidationSavings,
      adjustmentsApplied: adjustmentEntries.length,
      warnings,
    };
  }
}