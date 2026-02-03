export interface TrainingStartedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    startedAt: Date;
    attemptNumber: number;
}
