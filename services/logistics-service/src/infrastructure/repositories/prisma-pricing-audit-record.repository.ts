import { PricingAuditRecord, PricingAuditRecordData } from '../../domain/entities/pricing-audit-record.entity';
import { PricingAuditRecordRepository } from '../../domain/repositories/pricing-audit-record.repository';
import { DeliveryZone } from '../../domain/services/zone-classifier';

export class PrismaPricingAuditRecordRepository implements PricingAuditRecordRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(record: PricingAuditRecord): Promise<void> {
    const data = record.toJSON();
    await this.prisma?.Logistics_PricingAuditRecord?.create?.({
      data: {
        id: data.id,
        orderId: data.orderId ?? null,
        quoteId: data.quoteId,
        pricingVersion: data.pricingVersion,
        courierCompensationEstimate: data.courierCompensationEstimate,
        buyerDeliveryFee: data.buyerDeliveryFee,
        platformMarginAmount: data.platformMarginAmount,
        deliveryZone: data.deliveryZone ?? null,
        packageWeightKg: data.packageWeightKg,
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        recordedAt: data.recordedAt,
      },
    });
  }

  async findByQuoteId(quoteId: string): Promise<PricingAuditRecord | null> {
    const row = await this.prisma?.Logistics_PricingAuditRecord?.findUnique?.({
      where: { quoteId },
    });
    if (!row) return null;

    const data: PricingAuditRecordData = {
      id: row.id,
      orderId: row.orderId ?? undefined,
      quoteId: row.quoteId,
      pricingVersion: row.pricingVersion,
      courierCompensationEstimate: Number(row.courierCompensationEstimate),
      buyerDeliveryFee: Number(row.buyerDeliveryFee),
      platformMarginAmount: Number(row.platformMarginAmount),
      deliveryZone: row.deliveryZone as DeliveryZone | null,
      packageWeightKg: row.packageWeightKg,
      distanceKm: row.distanceKm,
      durationMinutes: row.durationMinutes,
      recordedAt: row.recordedAt,
    };
    return new PricingAuditRecord(data);
  }
}
