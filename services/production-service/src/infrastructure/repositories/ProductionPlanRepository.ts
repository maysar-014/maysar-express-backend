
import { PrismaClient } from '@prisma/client';
import { IProductionRepository } from '../../domain/interfaces/IProductionRepository';
import { ProductionPlan, ProductionStatus, ProductionPriority } from '../../domain/entities/ProductionPlan.entity';
import { ProductionSchedule } from '../../domain/value-objects/production-schedule.value-object';

export class ProductionPlanRepository implements IProductionRepository {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async save(plan: ProductionPlan): Promise<ProductionPlan> {
        const data = await this.prisma.production_Plan.create({
            data: {
                id: plan.id,
                supplierId: plan.supplierId,
                name: plan.name,
                status: plan.status as any,
                priority: plan.priority as any,
                startDate: plan.schedule.startTime,
                endDate: plan.schedule.endTime,
                targetQuantity: plan.targetQuantity,
                actualQuantity: plan.actualQuantity
            }
        });

        return this.toEntity(data);
    }

    async findById(id: string): Promise<ProductionPlan | null> {
        const data = await this.prisma.production_Plan.findUnique({ where: { id } });
        if (!data) return null;
        return this.toEntity(data);
    }

    async findBySupplierId(supplierId: string): Promise<ProductionPlan[]> {
        const data = await this.prisma.production_Plan.findMany({ where: { supplierId } });
        return data.map(d => this.toEntity(d));
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await this.prisma.production_Plan.update({
            where: { id },
            data: { status: status as any }
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.production_Plan.delete({ where: { id } });
    }

    private toEntity(data: any): ProductionPlan {
        return new ProductionPlan({
            id: data.id,
            supplierId: data.supplierId,
            name: data.name,
            status: data.status as ProductionStatus,
            priority: data.priority as ProductionPriority,
            schedule: new ProductionSchedule({
                startTime: data.startDate,
                endTime: data.endDate
            }),
            targetQuantity: data.targetQuantity,
            actualQuantity: data.actualQuantity,
            version: data.version,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}
