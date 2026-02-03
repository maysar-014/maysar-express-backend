export interface TrainingFailedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    score: number;
    failedAt: Date;
    remainingAttempts: number;
}
