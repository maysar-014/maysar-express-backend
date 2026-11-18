/**
 * ReconcileDeliveryQuoteUseCase (MYS-DEL-001 Article 32)
 *
 * After each completed or terminal delivery, compare the quote-time snapshot
 * against what actually happened and write a reconciliation record to the
 * ledger. This feeds the Article 34 executive dashboard.
 *
 * Comparison points (Article 32):
 *   1. Quoted distance vs actual distance.
 *   2. Estimated duration vs actual duration.
 *   3. Estimated driver compensation vs actual payout.
 *   4. Estimated fulfillment cost vs actual cost (from ledger).
 *   5. Expected platform contribution vs realized contribution (from ledger).
 *
 * Material differences (> 15% deviation) are classified and surfaced as
 * warnings for ops review. The thresholds are intentionally conservative
 * pre-launch; they should be tightened as real data accumulates.
 *
 * This use-case is APPEND-ONLY on the ledger (writes one ADJUSTMENT entry
 * of type RECONCILIATION_DELTA when a material deviation exists). It never
 * overwrites the original quote snapshot or ledger entries.
 */

import { PricingAuditRecordRepository } from '../../domain/repositories/pricing-audit-record.repository';
import { LedgerEntryRepository } from '../../domain/repositories/cost-model.repository';
import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';
import { makeId } from '../../../../../shared/ids/id';

export interface ReconcileDeliveryQuoteRequest {
  /** The logistics quote ID that was used for this delivery. */
  quoteId: string;
  /** The delivery job ID whose ledger contains actual settlement data. */
  deliveryJobId: string;
  /** Actual distance driven in km (from GPS or routing provider post-delivery). */
  actualDistanceKm: number;
  /** Actual duration in minutes (from GPS or dispatch system). */
  actualDurationMinutes: number;
  /** Actual driver payout in TZS (from settlement). */
  actualDriverPayoutTzs: number;
  /** Pricing version at time of quote (for reproducibility). */
  pricingVersion: number;
}

export interface ReconciliationDeviation {
  field: string;
  quotedValue: number;
  actualValue: number;
  deviationPct: number;
  isMaterial: boolean;
  note: string;
}

export interface ReconcileDeliveryQuoteResult {
  quoteId: string;
  deliveryJobId: string;
  deviations: ReconciliationDeviation[];
  hasMaterialDeviation: boolean;
  quotedPlatformContribution: number;
  realizedPlatformContribution: number;
  platformContributionDeltaTzs: number;
  reconciledAt: Date;
  warnings: string[];
}

/** Deviation threshold above which a difference is considered material. */
const MATERIAL_THRESHOLD_PCT = 15;

export class ReconcileDeliveryQuoteUseCase {
  constructor(
    private readonly auditRepo: PricingAuditRecordRepository,
    private readonly ledgerRepo: LedgerEntryRepository,
  ) {}

  async execute(request: ReconcileDeliveryQuoteRequest): Promise<ReconcileDeliveryQuoteResult> {
    const now = new Date();

    // 1. Load quote-time snapshot
    const auditRecord = await this.auditRepo.findByQuoteId(request.quoteId);
    if (!auditRecord) {
      throw new Error(
        `ReconcileDeliveryQuote: no PricingAuditRecord found for quoteId=${request.quoteId}. `
        + 'Cannot reconcile without a quote snapshot.',
      );
    }

    // 2. Load actual ledger entries for the job
    const entries = await this.ledgerRepo.findByDeliveryJobId(request.deliveryJobId);

    const actualBuyerCharge = entries
      .filter(e => e.entryType === 'BUYER_LOGISTICS_CHARGE')
      .reduce((sum, e) => sum + e.amountTzs, 0);

    const actualCarrierPayable = Math.abs(
      entries
        .filter(e => e.entryType === 'CARRIER_PAYABLE')
        .reduce((sum, e) => sum + e.amountTzs, 0),
    );

    const actualMaysarRevenue = entries
      .filter(e => e.entryType === 'MAYSAR_LOGISTICS_REVENUE')
      .reduce((sum, e) => sum + e.amountTzs, 0);

    // 3. Compute deviations
    const deviations: ReconciliationDeviation[] = [];

    deviations.push(this.deviation(
      'distanceKm',
      auditRecord.distanceKm,
      request.actualDistanceKm,
      'Route distance (km)',
    ));

    deviations.push(this.deviation(
      'durationMinutes',
      auditRecord.durationMinutes,
      request.actualDurationMinutes,
      'Delivery duration (minutes)',
    ));

    deviations.push(this.deviation(
      'driverPayoutTzs',
      auditRecord.courierCompensationEstimate,
      request.actualDriverPayoutTzs,
      'Driver compensation (TZS)',
    ));

    // 4. Platform contribution: quoted vs realized
    // Quoted: buyerFee - courierEstimate (simplified; payment/COD costs excluded at quote time)
    const quotedPlatformContribution = auditRecord.buyerDeliveryFee - auditRecord.courierCompensationEstimate;
    // Realized: from ledger (Maysar revenue entries, which are net of absorbed costs)
    const realizedPlatformContribution = actualMaysarRevenue;
    const platformContributionDeltaTzs = realizedPlatformContribution - quotedPlatformContribution;

    deviations.push(this.deviation(
      'platformContributionTzs',
      quotedPlatformContribution,
      realizedPlatformContribution,
      'Platform contribution (TZS)',
    ));

    // 5. Build warnings for material deviations
    const warnings: string[] = [];
    const materialDeviations = deviations.filter(d => d.isMaterial);
    for (const d of materialDeviations) {
      warnings.push(
        `Material deviation on ${d.field}: quoted=${d.quotedValue}, actual=${d.actualValue} `
        + `(${d.deviationPct.toFixed(1)}% — threshold ${MATERIAL_THRESHOLD_PCT}%). ${d.note}`,
      );
    }

    // 6. Write a reconciliation ADJUSTMENT ledger entry when material deviation exists
    if (materialDeviations.length > 0 && entries.length > 0) {
      try {
        const reconEntry = LedgerEntry.create({
          id: makeId('led'),
          deliveryJobId: request.deliveryJobId,
          entryType: 'ADJUSTMENT',
          amountTzs: platformContributionDeltaTzs,
          counterpartyId: 'MAYSAR',
          pricingVersion: request.pricingVersion,
          metadata: {
            type: 'RECONCILIATION_DELTA',
            quoteId: request.quoteId,
            deviations: materialDeviations.map(d => ({
              field: d.field,
              quoted: d.quotedValue,
              actual: d.actualValue,
              pct: d.deviationPct,
            })),
            reconciledAt: now.toISOString(),
          },
        });
        await this.ledgerRepo.append(reconEntry);
      } catch {
        // Non-fatal: reconciliation delta write failed; the reconciliation
        // result is still returned for ops visibility.
        warnings.push('Warning: failed to write reconciliation ADJUSTMENT ledger entry.');
      }
    }

    return {
      quoteId: request.quoteId,
      deliveryJobId: request.deliveryJobId,
      deviations,
      hasMaterialDeviation: materialDeviations.length > 0,
      quotedPlatformContribution,
      realizedPlatformContribution,
      platformContributionDeltaTzs,
      reconciledAt: now,
      warnings,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private deviation(
    field: string,
    quoted: number,
    actual: number,
    note: string,
  ): ReconciliationDeviation {
    const deviationPct = quoted !== 0
      ? Math.abs((actual - quoted) / quoted) * 100
      : (actual !== 0 ? 100 : 0);
    return {
      field,
      quotedValue: quoted,
      actualValue: actual,
      deviationPct,
      isMaterial: deviationPct > MATERIAL_THRESHOLD_PCT,
      note,
    };
  }
}
