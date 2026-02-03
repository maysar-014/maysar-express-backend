export interface TrainingCompletedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    score: number;
    passed: boolean;
    completedAt: Date;
    expiresAt?: Date;
}
