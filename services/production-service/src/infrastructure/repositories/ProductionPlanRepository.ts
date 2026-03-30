
import { PrismaClient } from '@prisma/client';
import { IProductionRepository } from '../../domain/interfaces/IProductionRepository';
import { ProductionPlan, ProductionStatus, ProductionPriority } from '../../domain/entities/ProductionPlan.entity';
import { ProductionSchedule } from '../../domain/value-objects/production-schedule.value-object';

interface ProductionPlanDelegate {
    create(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    update(args: Record<string, unknown>): Promise<unknown>;
    delete(args: Record<string, unknown>): Promise<unknown>;
}

export class ProductionPlanRepository implements IProductionRepository {
    private prisma: PrismaClient;
    private static memoryStore: Map<string, any> = new Map();

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async save(plan: ProductionPlan): Promise<ProductionPlan> {
        const data = await this.planDelegate.create({
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

    async create(plan: ProductionPlan): Promise<ProductionPlan> {
        return this.save(plan);
    }

    async findById(id: string): Promise<ProductionPlan | null> {
        const data = await this.planDelegate.findUnique({ where: { id } });
        if (!data) return null;
        return this.toEntity(data);
    }

    async findBySupplierId(supplierId: string): Promise<ProductionPlan[]> {
        const data = await this.planDelegate.findMany({ where: { supplierId } });
        return data.map((d: any) => this.toEntity(d));
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await this.planDelegate.update({
            where: { id },
            data: { status: status as any }
        });
    }

    async delete(id: string): Promise<void> {
        await this.planDelegate.delete({ where: { id } });
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

    private get planDelegate(): ProductionPlanDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.production_Plan ??
            client.productionPlan) as ProductionPlanDelegate | undefined;
        if (!delegate) {
            // Fallback to in-memory store for environments without the model configured
            return {
                async create(args: Record<string, unknown>) {
                    const data = (args as any).data || {};
                    const record = {
                        ...data,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        version: data.version ?? 1
                    };
                    ProductionPlanRepository.memoryStore.set(record.id, record);
                    return record;
                },
                async findUnique(args: Record<string, unknown>) {
                    const id = (args as any)?.where?.id;
                    return id ? ProductionPlanRepository.memoryStore.get(id) ?? null : null;
                },
                async findMany(args: Record<string, unknown>) {
                    const where = (args as any)?.where || {};
                    const values = Array.from(ProductionPlanRepository.memoryStore.values());
                    if (where.supplierId) {
                        return values.filter((v) => v.supplierId === where.supplierId);
                    }
                    return values;
                },
                async update(args: Record<string, unknown>) {
                    const id = (args as any)?.where?.id;
                    const existing = id ? ProductionPlanRepository.memoryStore.get(id) : null;
                    if (!existing) {
                        throw new Error('Production plan not found');
                    }
                    const data = (args as any)?.data || {};
                    const updated = { ...existing, ...data, updatedAt: new Date() };
                    ProductionPlanRepository.memoryStore.set(id, updated);
                    return updated;
                },
                async delete(args: Record<string, unknown>) {
                    const id = (args as any)?.where?.id;
                    const existing = id ? ProductionPlanRepository.memoryStore.get(id) : null;
                    if (!existing) {
                        throw new Error('Production plan not found');
                    }
                    ProductionPlanRepository.memoryStore.delete(id);
                    return existing;
                }
            };
        }
        return delegate;
    }
}
