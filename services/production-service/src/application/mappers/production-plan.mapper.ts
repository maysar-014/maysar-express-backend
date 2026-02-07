
import { ProductionPlan } from '../../domain/entities/ProductionPlan.entity';
import { ProductionPlanResponseDto } from '../dto/production-plan.dto';

export class ProductionPlanMapper {
    static toDto(plan: ProductionPlan): ProductionPlanResponseDto {
        return {
            id: plan.id,
            supplierId: plan.supplierId,
            name: plan.name,
            status: plan.status,
            priority: plan.priority,
            targetQuantity: plan.targetQuantity,
            actualQuantity: plan.actualQuantity,
            startDate: plan.schedule.startTime.toISOString(),
            endDate: plan.schedule.endTime.toISOString(),
            createdAt: new Date().toISOString(), // In real entity these exist
            updatedAt: new Date().toISOString()
        };
    }
}
