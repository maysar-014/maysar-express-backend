export class GetTrainingProgressRequest {
    learnerId!: string;
}

export interface TrainingRecordDTO {
    id: string;
    moduleId: string;
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    score?: number;
    attempts: number;
    expiresAt?: Date;
}

export class TrainingProgressResponse {
    completed!: TrainingRecordDTO[];
    inProgress!: TrainingRecordDTO[];
    required!: string[];
    eligible!: boolean;
}
