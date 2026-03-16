
import { CreateProductionPlanDto, ProductionPlanResponseDto } from '../dto/production-plan.dto';
import { IProductionRepository } from '../../domain/interfaces/IProductionRepository';
import { ProductionPlanningEngine } from '../../domain/engines/ProductionPlanningEngine';
import { ProductionPlan, ProductionStatus } from '../../domain/entities/ProductionPlan.entity';
import { ProductionSchedule } from '../../domain/value-objects/production-schedule.value-object';
import { ProductionCapacity } from '../../domain/value-objects/production-capacity.value-object';
import { ProductionPlanMapper } from '../mappers/production-plan.mapper';
import { getModelPrefix, makeId } from '@shared/ids/id';

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
            id: makeId(getModelPrefix('Production_Plan')),
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

        const capacity = new ProductionCapacity({
            maxCapacity: dto.maxCapacity ?? dto.targetQuantity,
            usedCapacity: dto.usedCapacity ?? 0,
            reservedCapacity: dto.reservedCapacity ?? 0,
            unit: dto.capacityUnit ?? 'units'
        });

        const isValid = this.planningEngine.validatePlan(plan, capacity);
        if (!isValid) {
            throw new Error('Production plan failed capacity validation');
        }

        const savedPlan = await this.repo.save(plan);
        return ProductionPlanMapper.toDto(savedPlan);
    }
}
