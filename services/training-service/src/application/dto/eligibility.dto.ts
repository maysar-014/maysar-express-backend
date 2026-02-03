export class CheckEligibilityRequest {
    learnerId!: string;
}

export class EligibilityResponse {
    eligible!: boolean;
    missingRequirements!: string[];
}
