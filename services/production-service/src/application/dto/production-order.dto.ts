
import { ProductionOrderStatus, ProductionPhase } from '../../domain/entities/ProductionOrder.entity';

export interface CreateProductionOrderDto {
    planId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    scheduleStart: string;
    scheduleEnd: string;
}

export interface ProductionOrderResponseDto {
    id: string;
    planId: string;
    productId: string;
    status: ProductionOrderStatus;
    phase: ProductionPhase;
    quantity: number;
    producedQty: number;
    defectedQty: number;
    startDate?: string;
    endDate?: string;
}
