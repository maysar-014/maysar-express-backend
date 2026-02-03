export interface TrainingStartedEvent {
    courierId: string;
    moduleId: string;
    startedAt: Date;
    attemptNumber: number;
}

export interface TrainingCompletedEvent {
    courierId: string;
    moduleId: string;
    score: number;
    passed: boolean;
    completedAt: Date;
    expiresAt?: Date;
}

export interface CertificationExpiredEvent {
    courierId: string;
    moduleId: string;
    expiredAt: Date;
}

export interface CourierEligibilityChangedEvent {
    courierId: string;
    eligible: boolean;
    missingRequirements: string[];
    changedAt: Date;
}
