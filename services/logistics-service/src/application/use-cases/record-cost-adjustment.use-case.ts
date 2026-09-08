/**
 * RecordCostAdjustmentUseCase (Phase 3 §3.2)
 *
 * Records an immutable Logistics_CostAdjustment for a DeliveryJob —
 * attribution resolved either from an operational event via the pure
 * `resolveAttribution` rules, or passed explicitly (ops override with
 * evidence).
 *
 * Mirrors the adjustment into the ledger as an append-only ADJUSTMENT entry
 * with `responsibleParty` in its metadata. This is what lets settlement read
 * THE LEDGER ONLY (§3.3) while still applying the §3.2 attribution rules —
 * no settlement path ever queries adjustments directly.
 */

import { resolveAttribution, AttributionEvent } from '../../domain/engines/cost-attribution';
import { CostAdjustment, ResponsibleParty, CostAdjustmentType } from '../../domain/entities/cost-adjustment.entity';
import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';
import { CostAdjustmentRepository, LedgerEntryRepository } from '../../domain/repositories/cost-model.repository';
import { makeId } from '../../../../../shared/ids/id';

export interface RecordCostAdjustmentRequest {
  deliveryJobId: string;
  shipmentId?: string | null;
  /** Operational event — attribution resolved by the §3.2 rules. */
  event?: AttributionEvent;
  /** Ops override: explicit type + party (requires recordedBy + evidence). */
  explicit?: { adjustmentType: CostAdjustmentType; responsibleParty: ResponsibleParty };
  amountTzs: number;
  reason: string;
  evidenceUrl?: string | null;
  recordedBy: string;
  pricingVersion: number;
  tariffVersion?: number | null;
  routingVersion?: string | null;
}

export interface RecordCostAdjustmentResult {
  adjustmentId: string;
  ledgerEntryId: string;
  adjustmentType: CostAdjustmentType;
  responsibleParty: ResponsibleParty;
}

export class RecordCostAdjustmentUseCase {
  constructor(
    private readonly adjustmentRepo: CostAdjustmentRepository,
    private readonly ledgerRepo: LedgerEntryRepository,
  ) {}

  async execute(request: RecordCostAdjustmentRequest): Promise<RecordCostAdjustmentResult> {
    if (request.amountTzs <= 0) {
      throw new Error('CostAdjustment rejected: amountTzs must be positive (zero-cost deviations are not adjustments)');
    }
    const attribution = request.event
      ? resolveAttribution(request.event)
      : request.explicit;
    if (!attribution) {
      throw new Error('CostAdjustment rejected: provide either an operational event or an explicit attribution');
    }
    if (request.event && request.explicit) {
      throw new Error('CostAdjustment rejected: event and explicit attribution are mutually exclusive');
    }

    const adjustment = CostAdjustment.create({
      id: makeId('cad'),
      deliveryJobId: request.deliveryJobId,
      shipmentId: request.shipmentId ?? null,
      adjustmentType: attribution.adjustmentType,
      responsibleParty: attribution.responsibleParty,
      amountTzs: request.amountTzs,
      reason: request.reason,
      evidenceUrl: request.evidenceUrl ?? null,
      recordedBy: request.recordedBy,
    });
    await this.adjustmentRepo.save(adjustment);

    // Ledger mirror — sign convention: negative = cost to the responsible
    // party. Customer-attributed amounts are positive here (a receivable
    // against the customer) and classified by settlement per policy.
    const entry = LedgerEntry.create({
      id: makeId('lge'),
      deliveryJobId: request.deliveryJobId,
      shipmentId: request.shipmentId ?? null,
      entryType: 'ADJUSTMENT',
      amountTzs: request.amountTzs,
      counterpartyId: request.recordedBy,
      pricingVersion: request.pricingVersion,
      tariffVersion: request.tariffVersion ?? null,
      routingVersion: request.routingVersion ?? null,
      metadata: {
        adjustmentId: adjustment.id,
        adjustmentType: attribution.adjustmentType,
        responsibleParty: attribution.responsibleParty,
        reason: request.reason,
        evidenceUrl: request.evidenceUrl ?? null,
      },
    });
    await this.ledgerRepo.append(entry);

    return {
      adjustmentId: adjustment.id,
      ledgerEntryId: entry.id,
      adjustmentType: attribution.adjustmentType,
      responsibleParty: attribution.responsibleParty,
    };
  }
}
