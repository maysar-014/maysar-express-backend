import { IEnablerOrderRepository } from '../../domain/repositories/enabler-order.repository.interface';
import { EnablerOrderEntity } from '../../domain/entities/enabler-order.entity';
import prisma from '../database/prisma-client';

export class PrismaEnablerOrderRepository implements IEnablerOrderRepository {

    async findById(id: string): Promise<EnablerOrderEntity | null> {
        const data = await prisma.enabler_Order.findUnique({ where: { id } });
        if (!data) return null;
        return this.mapToEntity(data);
    }

    async findByEnablerId(enablerId: string): Promise<EnablerOrderEntity[]> {
        const data = await prisma.enabler_Order.findMany({ where: { enablerId } });
        return data.map(this.mapToEntity);
    }

    async findByOrderId(orderId: string): Promise<EnablerOrderEntity | null> {
        const data = await prisma.enabler_Order.findUnique({ where: { orderId } });
        if (!data) return null;
        return this.mapToEntity(data);
    }

    async findPendingCommissions(): Promise<EnablerOrderEntity[]> {
        const data = await prisma.enabler_Order.findMany({
            where: {
                status: 'COMPLETED',
                settlementStatus: 'pending'
            }
        });
        return data.map(this.mapToEntity);
    }

    async save(order: EnablerOrderEntity): Promise<void> {
        const data = order.toPlainObject();
        await prisma.enabler_Order.create({
            data: {
                id: data.id,
                enablerId: data.enablerId,
                orderId: data.orderId,
                sellerId: data.sellerId,
                buyerId: data.buyerId,
                productListingId: data.productListingId,
                status: data.status,
                orderAmount: data.orderAmount,
                productAmount: data.productAmount,
                enablerCommission: data.enablerCommission,
                commissionRate: data.commissionRate,
                settlementStatus: data.settlementStatus,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            }
        });
    }

    async update(order: EnablerOrderEntity): Promise<void> {
        const data = order.toPlainObject();
        await prisma.enabler_Order.update({
            where: { id: data.id },
            data: {
                status: data.status,
                settlementStatus: data.settlementStatus,
                sellerPaidAt: data.sellerPaidAt,
                enablerPaidAt: data.enablerPaidAt,
                disputeStatus: data.disputeStatus,
                updatedAt: new Date()
            }
        });
    }

    private mapToEntity(data: any): EnablerOrderEntity {
        return EnablerOrderEntity.create({
            ...data,
            orderAmount: Number(data.orderAmount),
            productAmount: Number(data.productAmount),
            enablerCommission: Number(data.enablerCommission),
            platformFee: Number(data.platformFee),
            commissionRate: Number(data.commissionRate),
            tierBonus: Number(data.tierBonus),
            performanceBonus: Number(data.performanceBonus)
        });
    }
}
