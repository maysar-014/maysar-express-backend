import { Quote, QuoteData } from '../../domain/entities/quote.entity';
import { QuoteRepository } from '../../domain/repositories/quote.repository';
import { DeliveryZone } from '../../domain/services/zone-classifier';
import { PricingBreakdown } from '../../domain/engines/delivery-pricing.engine';

export class PrismaQuoteRepository implements QuoteRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(quote: Quote): Promise<void> {
    const data = quote.toData();
    await this.prisma?.Logistics_Quote?.upsert?.({
      where: { id: data.quoteId },
      update: {
        deliveryFee: data.deliveryFee,
        courierCompensationEstimate: data.courierCompensationEstimate,
        platformMarginAmount: data.platformMarginAmount,
        pricingVersion: data.pricingVersion,
        deliveryZone: data.deliveryZone,
        status: data.status,
        breakdown: data.breakdown as any,
        unavailableReason: data.unavailableReason ?? null,
        expiresAt: data.expiresAt,
        consumedAt: (data as any).consumedAt ?? null,
        updatedAt: new Date(),
      },
      create: {
        id: data.quoteId,
        deliveryFee: data.deliveryFee,
        courierCompensationEstimate: data.courierCompensationEstimate,
        platformMarginAmount: data.platformMarginAmount,
        pricingVersion: data.pricingVersion,
        originLat: data.originLat,
        originLng: data.originLng,
        originAddress: data.originAddress,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        destinationAddress: data.destinationAddress,
        packageWeightKg: data.packageWeightKg,
        deliveryZone: data.deliveryZone ?? null,
        status: data.status,
        breakdown: data.breakdown as any,
        unavailableReason: data.unavailableReason ?? null,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findById(quoteId: string): Promise<Quote | null> {
    const row = await this.prisma?.Logistics_Quote?.findUnique?.({ where: { id: quoteId } });
    if (!row) return null;
    return this.rowToQuote(row);
  }

  async markConsumed(quoteId: string): Promise<void> {
    await this.prisma?.Logistics_Quote?.update?.({
      where: { id: quoteId },
      data: { status: 'CONSUMED', consumedAt: new Date(), updatedAt: new Date() },
    });
  }

  async markExpired(quoteId: string): Promise<void> {
    await this.prisma?.Logistics_Quote?.update?.({
      where: { id: quoteId },
      data: { status: 'EXPIRED', updatedAt: new Date() },
    });
  }

  private rowToQuote(row: any): Quote {
    const data: QuoteData = {
      quoteId: row.id,
      deliveryFee: Number(row.deliveryFee),
      courierCompensationEstimate: Number(row.courierCompensationEstimate),
      platformMarginAmount: Number(row.platformMarginAmount),
      pricingVersion: row.pricingVersion,
      originLat: row.originLat,
      originLng: row.originLng,
      originAddress: row.originAddress,
      destinationLat: row.destinationLat,
      destinationLng: row.destinationLng,
      destinationAddress: row.destinationAddress,
      packageWeightKg: row.packageWeightKg,
      deliveryZone: row.deliveryZone as DeliveryZone | null,
      status: row.status as any,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      breakdown: row.breakdown as PricingBreakdown | null,
      unavailableReason: row.unavailableReason ?? undefined,
      consumedAt: row.consumedAt ?? undefined,
    };
    return new Quote(data);
  }
}
