import { DeliveryGroup, DeliveryGroupData } from '../../domain/entities/delivery-group.entity';
import { DeliveryGroupRepository } from '../../domain/repositories/delivery-group.repository';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class PrismaDeliveryGroupRepository implements DeliveryGroupRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(group: DeliveryGroup): Promise<void> {
    const data = group.toData();
    await this.prisma?.logistics_DeliveryGroup?.upsert?.({
      where: { id: data.id },
      create: {
        id: data.id,
        masterOrderId: data.masterOrderId,
        sellerOrderIds: data.sellerOrderIds as any,
        pickupSequence: data.pickupSequence.map(p => p.toJSON()) as any,
        buyerDestination: data.buyerDestination.toJSON() as any,
        totalDeliveryCost: data.totalDeliveryCost,
        pricingVersion: data.pricingVersion,
        allocationAlgorithm: data.allocationAlgorithm,
        status: data.status,
        quoteId: data.quoteId ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        status: data.status,
        totalDeliveryCost: data.totalDeliveryCost,
        pricingVersion: data.pricingVersion,
        quoteId: data.quoteId ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<DeliveryGroup | null> {
    const row = await this.prisma?.logistics_DeliveryGroup?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByMasterOrderId(masterOrderId: string): Promise<DeliveryGroup[]> {
    const rows = await this.prisma?.logistics_DeliveryGroup?.findMany?.({
      where: { masterOrderId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async updateStatus(id: string, status: string, quoteId?: string): Promise<void> {
    await this.prisma?.logistics_DeliveryGroup?.update?.({
      where: { id },
      data: { status, quoteId: quoteId ?? null, updatedAt: new Date() },
    });
  }

  private rowToEntity(row: any): DeliveryGroup {
    const seq: GeoPoint[] = (row.pickupSequence as any[]).map((p: any) =>
      GeoPoint.create(p.lat, p.lng, p.address ?? ''),
    );
    const dest = (row.buyerDestination as any);
    const data: DeliveryGroupData = {
      id: row.id,
      masterOrderId: row.masterOrderId,
      sellerOrderIds: row.sellerOrderIds as string[],
      pickupSequence: seq,
      buyerDestination: GeoPoint.create(dest.lat, dest.lng, dest.address ?? ''),
      totalDeliveryCost: Number(row.totalDeliveryCost),
      pricingVersion: row.pricingVersion,
      allocationAlgorithm: (row.allocationAlgorithm ?? 'weight_proportional') as 'weight_proportional',
      status: row.status,
      quoteId: row.quoteId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return new DeliveryGroup(data);
  }
}
