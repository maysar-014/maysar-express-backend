/**
 * Prisma implementations for the Phase 3 cost-model repositories.
 *
 * CostAdjustment and LedgerEntry use `create` only — the append-only /
 * immutable contracts live here by design. FulfillmentCommitment supports
 * create + a status transition update (LOCKED → CONSUMED | EXPIRED only).
 */

import { CostAdjustment, CostAdjustmentData, ResponsibleParty } from '../../domain/entities/cost-adjustment.entity';
import { LedgerEntry, LedgerEntryData, LedgerEntryType } from '../../domain/entities/ledger-entry.entity';
import { FulfillmentCommitment, FulfillmentCommitmentData } from '../../domain/entities/fulfillment-commitment.entity';
import {
  CostAdjustmentRepository,
  LedgerEntryRepository,
  FulfillmentCommitmentRepository,
} from '../../domain/repositories/cost-model.repository';

// ─── CostAdjustment (immutable) ───────────────────────────────────────────────

export class PrismaCostAdjustmentRepository implements CostAdjustmentRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  /** Create-only. Never updates an existing adjustment. */
  async save(adjustment: CostAdjustment): Promise<void> {
    const data = adjustment.toData();
    await this.prisma?.logistics_CostAdjustment?.create?.({
      data: {
        id: data.id,
        deliveryJobId: data.deliveryJobId,
        shipmentId: data.shipmentId,
        adjustmentType: data.adjustmentType,
        amountTzs: data.amountTzs,
        responsibleParty: data.responsibleParty,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl,
        recordedAt: data.recordedAt,
        recordedBy: data.recordedBy,
      },
    });
  }

  async findByDeliveryJobId(deliveryJobId: string): Promise<CostAdjustment[]> {
    const rows = await this.prisma?.logistics_CostAdjustment?.findMany?.({
      where: { deliveryJobId },
      orderBy: { recordedAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findByDeliveryJobIdAndParty(deliveryJobId: string, party: ResponsibleParty): Promise<CostAdjustment[]> {
    const rows = await this.prisma?.logistics_CostAdjustment?.findMany?.({
      where: { deliveryJobId, responsibleParty: party },
      orderBy: { recordedAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): CostAdjustment {
    const data: CostAdjustmentData = {
      id: row.id,
      deliveryJobId: row.deliveryJobId,
      shipmentId: row.shipmentId ?? null,
      adjustmentType: row.adjustmentType,
      amountTzs: Number(row.amountTzs),
      responsibleParty: row.responsibleParty,
      reason: row.reason,
      evidenceUrl: row.evidenceUrl ?? null,
      recordedAt: row.recordedAt,
      recordedBy: row.recordedBy,
    };
    return new CostAdjustment(data);
  }
}

// ─── LedgerEntry (append-only) ────────────────────────────────────────────────

export class PrismaLedgerEntryRepository implements LedgerEntryRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  /** Append-only. Never updates an existing ledger row. */
  async append(entry: LedgerEntry): Promise<void> {
    const data = entry.toData();
    await this.prisma?.logistics_LedgerEntry?.create?.({
      data: {
        id: data.id,
        deliveryJobId: data.deliveryJobId,
        shipmentId: data.shipmentId,
        entryType: data.entryType,
        amountTzs: data.amountTzs,
        counterpartyId: data.counterpartyId,
        pricingVersion: data.pricingVersion,
        tariffVersion: data.tariffVersion,
        routingVersion: data.routingVersion,
        calculatedAt: data.calculatedAt,
        metadata: data.metadata as any,
      },
    });
  }

  async findByDeliveryJobId(deliveryJobId: string): Promise<LedgerEntry[]> {
    const rows = await this.prisma?.logistics_LedgerEntry?.findMany?.({
      where: { deliveryJobId },
      orderBy: { calculatedAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findByDeliveryJobIdAndType(deliveryJobId: string, entryType: LedgerEntryType): Promise<LedgerEntry[]> {
    const rows = await this.prisma?.logistics_LedgerEntry?.findMany?.({
      where: { deliveryJobId, entryType },
      orderBy: { calculatedAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): LedgerEntry {
    const data: LedgerEntryData = {
      id: row.id,
      deliveryJobId: row.deliveryJobId,
      shipmentId: row.shipmentId ?? null,
      entryType: row.entryType,
      amountTzs: Number(row.amountTzs),
      counterpartyId: row.counterpartyId,
      pricingVersion: Number(row.pricingVersion),
      tariffVersion: row.tariffVersion !== null && row.tariffVersion !== undefined ? Number(row.tariffVersion) : null,
      routingVersion: row.routingVersion ?? null,
      calculatedAt: row.calculatedAt,
      metadata: row.metadata ?? {},
    };
    return new LedgerEntry(data);
  }
}

// ─── FulfillmentCommitment (price lock) ───────────────────────────────────────

export class PrismaFulfillmentCommitmentRepository implements FulfillmentCommitmentRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(commitment: FulfillmentCommitment): Promise<void> {
    const data = commitment.toData();
    await this.prisma?.logistics_FulfillmentCommitment?.upsert?.({
      where: { quoteId: data.quoteId },
      create: {
        id: data.id,
        checkoutSessionId: data.checkoutSessionId,
        quoteId: data.quoteId,
        buyerPriceTzs: data.buyerPriceTzs,
        pricingVersion: data.pricingVersion,
        lockedAt: data.lockedAt,
        expiresAt: data.expiresAt,
        status: data.status,
      },
      // buyerPriceTzs is NEVER updated — only the status may transition.
      update: {
        status: data.status,
      },
    });
  }

  async findByQuoteId(quoteId: string): Promise<FulfillmentCommitment | null> {
    const row = await this.prisma?.logistics_FulfillmentCommitment?.findUnique?.({ where: { quoteId } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByCheckoutSessionId(checkoutSessionId: string): Promise<FulfillmentCommitment[]> {
    const rows = await this.prisma?.logistics_FulfillmentCommitment?.findMany?.({
      where: { checkoutSessionId },
      orderBy: { lockedAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.prisma?.logistics_FulfillmentCommitment?.update?.({
      where: { id },
      data: { status },
    });
  }

  private rowToEntity(row: any): FulfillmentCommitment {
    const data: FulfillmentCommitmentData = {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      quoteId: row.quoteId,
      buyerPriceTzs: Number(row.buyerPriceTzs),
      pricingVersion: Number(row.pricingVersion),
      lockedAt: row.lockedAt,
      expiresAt: row.expiresAt,
      status: row.status,
    };
    return new FulfillmentCommitment(data);
  }
}