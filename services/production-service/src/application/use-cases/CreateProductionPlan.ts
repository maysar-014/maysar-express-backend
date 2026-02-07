
import { CreateProductionPlanDto, ProductionPlanResponseDto } from '../dto/production-plan.dto';
import { IProductionRepository } from '../../domain/interfaces/IProductionRepository';
import { ProductionPlanningEngine } from '../../domain/engines/ProductionPlanningEngine';
import { ProductionPlan, ProductionStatus } from '../../domain/entities/ProductionPlan.entity';
import { ProductionSchedule } from '../../domain/value-objects/production-schedule.value-object';
import { ProductionCapacity } from '../../domain/value-objects/production-capacity.value-object';
import { ProductionPlanMapper } from '../mappers/production-plan.mapper';

export class CreateProductionPlan {
    constructor(
        private readonly repo: IProductionRepository,
        private readonly planningEngine: ProductionPlanningEngine
    ) { }

    async execute(dto: CreateProductionPlanDto): Promise<ProductionPlanResponseDto> {
        const schedule = new ProductionSchedule({
            startTime: new Date(dto.startDate),
            endTime: new Date(dto.endDate)
        });

        const plan = new ProductionPlan({
            id: crypto.randomUUID(),
            supplierId: dto.supplierId,
            name: dto.name,
            targetQuantity: dto.targetQuantity,
            actualQuantity: 0,
            status: ProductionStatus.DRAFT,
            priority: dto.priority || 'MEDIUM' as any,
            version: 1,
            schedule,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Mock capacity check for now
        const capacity = new ProductionCapacity({
            maxCapacity: 1000,
            usedCapacity: 0,
            reservedCapacity: 0,
            unit: 'units'
        });

        if (!this.planningEngine.validatePlan(plan, capacity)) {
            throw new Error('Plan validation failed or insufficient capacity');
        }

        const savedPlan = await this.repo.save(plan);
        return ProductionPlanMapper.toDto(savedPlan);
    }
}
