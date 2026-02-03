export class CompleteTrainingRequest {
    trainingRecordId!: string;
    score!: number;
    answers?: any;
}

export class CompleteTrainingResponse {
    passed!: boolean;
    score!: number;
    expiresAt?: Date;
}
