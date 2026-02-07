
import { PrismaClient } from '@prisma/client';
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';
import { ProductionOrder, ProductionOrderStatus, ProductionPhase } from '../../domain/entities/ProductionOrder.entity';
import { ProductionSchedule } from '../../domain/value-objects/production-schedule.value-object';

export class ProductionOrderRepository implements IProductionOrderRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(order: ProductionOrder): Promise<ProductionOrder> {
        // Upsert logic typically, or separate create/update
        // Assuming create for simplicity as "save" in DDD usually means persist state
        // But prisma is specific. Let's assume create or update based on existence check or upsert
        // For now, let's use upsert
        const data = await this.prisma.production_Order.upsert({
            where: { id: order.id },
            update: {
                status: order.status as any,
                phase: order.phase as any,
                producedQty: (order as any).props.producedQty, // Accessing private props workaround or add public getters
                defectedQty: (order as any).props.defectedQty
            },
            create: {
                id: order.id,
                planId: (order as any).props.planId,
                productId: order.productId,
                quantity: order.quantity,
                scheduledStart: (order as any).props.schedule.startTime, // Accessing private
                scheduledEnd: (order as any).props.schedule.endTime,
                status: order.status as any
            }
        });
        return this.toEntity(data);
    }

    async findById(id: string): Promise<ProductionOrder | null> {
        const data = await this.prisma.production_Order.findUnique({ where: { id } });
        if (!data) return null;
        return this.toEntity(data);
    }

    async findByPlanId(planId: string): Promise<ProductionOrder[]> {
        const data = await this.prisma.production_Order.findMany({ where: { planId } });
        return data.map(d => this.toEntity(d));
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await this.prisma.production_Order.update({
            where: { id },
            data: { status: status as any }
        });
    }

    private toEntity(data: any): ProductionOrder {
        return new ProductionOrder({
            id: data.id,
            planId: data.planId,
            productId: data.productId,
            quantity: data.quantity,
            producedQty: data.producedQty,
            defectedQty: data.defectedQty,
            status: data.status as ProductionOrderStatus,
            phase: data.phase as ProductionPhase,
            schedule: new ProductionSchedule({
                startTime: data.scheduledStart,
                endTime: data.scheduledEnd
            }),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}
