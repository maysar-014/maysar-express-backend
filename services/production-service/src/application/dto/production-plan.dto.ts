
import { ProductionStatus, ProductionPriority } from '../../domain/entities/ProductionPlan.entity';

export interface CreateProductionPlanDto {
    supplierId: string;
    name: string;
    description?: string;
    targetQuantity: number;
    startDate: string;
    endDate: string;
    priority?: ProductionPriority;
}

export interface UpdateProductionPlanDto {
    status?: ProductionStatus;
    targetQuantity?: number;
}

export interface ProductionPlanResponseDto {
    id: string;
    supplierId: string;
    name: string;
    status: ProductionStatus;
    priority: ProductionPriority;
    startDate: string;
    endDate: string;
    targetQuantity: number;
    actualQuantity: number;
    createdAt: string;
    updatedAt: string;
}
