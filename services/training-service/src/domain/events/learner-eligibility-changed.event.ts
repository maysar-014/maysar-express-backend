export interface LearnerEligibilityChangedEvent {
    learnerId: string;
    learnerRole: string;
    eligible: boolean;
    missingRequirements: string[];
    changedAt: Date;
}
