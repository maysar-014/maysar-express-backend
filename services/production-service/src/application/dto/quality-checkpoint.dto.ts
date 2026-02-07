
export interface QualityCheckpointDto {
    orderId: string;
    passed: boolean; // Simplified for input
    defectCount: number;
    notes?: string;
    images?: string[];
    inspectorId?: string;
}

export interface QualityCheckpointResponseDto {
    id: string;
    orderId: string;
    status: string;
    passed: boolean;
    defectCount: number;
    inspectionDate: string;
}
