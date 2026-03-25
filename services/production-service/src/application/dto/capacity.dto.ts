export interface CapacitySnapshotResponseDto {
    supplierId: string;
    date: string;
    maxCapacity: number;
    usedCapacity: number;
    reservedCapacity: number;
    availableCapacity: number;
    utilizationRate: number;
    unit: string;
    adjustedBy?: string;
    reason?: string;
    updatedAt: string;
}

export interface UpdateProductionCapacityDto {
    supplierId: string;
    date?: string;
    maxCapacity: number;
    usedCapacity: number;
    reservedCapacity: number;
    unit: string;
    adjustedBy?: string;
    reason?: string;
}
