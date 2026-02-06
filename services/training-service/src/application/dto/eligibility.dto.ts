export class CheckEligibilityRequest {
    learnerId!: string;
}

export class EligibilityResponse {
    eligible!: boolean;
    completionPercentage!: number;
    missingRequirements!: string[];
    completedModules!: string[];
    inProgressModules!: string[];
}

