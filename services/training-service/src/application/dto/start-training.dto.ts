export class StartTrainingRequest {
    learnerId!: string;
    learnerRole!: string;
    moduleId!: string;
}

export class StartTrainingResponse {
    trainingRecordId!: string;
    status!: string;
}
