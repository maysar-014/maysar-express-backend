export interface TrainingProgressUpdatedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    progressPercentage: number;
    currentSection?: string;
    updatedAt: Date;
    correlationId?: string;
}
