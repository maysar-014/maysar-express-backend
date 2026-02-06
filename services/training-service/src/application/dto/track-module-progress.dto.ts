export interface TrackModuleProgressRequest {
    trainingRecordId: string;
    progressData: {
        lastModuleSection?: string;
        completionPercentage?: number;
        metadata?: Record<string, any>;
    };
}

export interface TrackModuleProgressResponse {
    trainingRecordId: string;
    status: string;
    updatedAt: Date;
}
