export interface TrainingStartedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    startedAt: Date;
    attemptNumber: number;
}

export interface TrainingCompletedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    score: number;
    passed: boolean;
    completedAt: Date;
    expiresAt?: Date;
    remainingAttempts: number;
}

export interface TrainingFailedEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    score: number;
    failedAt: Date;
    remainingAttempts: number;
}

export interface CertificationExpiredEvent {
    learnerId: string;
    moduleId: string;
    expiredAt: Date;
}

export interface LearnerEligibilityChangedEvent {
    learnerId: string;
    learnerRole: string;
    eligible: boolean;
    missingRequirements: string[];
    changedAt: Date;
}
