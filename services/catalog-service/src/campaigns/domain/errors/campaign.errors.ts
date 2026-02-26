export class CampaignError extends Error {
    constructor(message: string, public readonly code: string = 'CAMPAIGN_ERROR') {
        super(message);
        this.name = 'CampaignError';
    }
}

export class CampaignNotFoundError extends CampaignError {
    constructor(id: string) {
        super(`Campaign with ID ${id} not found`, 'CAMPAIGN_NOT_FOUND');
        this.name = 'CampaignNotFoundError';
    }
}

export class CampaignValidationError extends CampaignError {
    constructor(message: string) {
        super(message, 'CAMPAIGN_VALIDATION_ERROR');
        this.name = 'CampaignValidationError';
    }
}

export class InvalidScheduleError extends CampaignError {
    constructor(message: string) {
        super(message, 'INVALID_SCHEDULE_ERROR');
        this.name = 'InvalidScheduleError';
    }
}

export class PricingRuleError extends CampaignError {
    constructor(message: string) {
        super(message, 'PRICING_RULE_ERROR');
        this.name = 'PricingRuleError';
    }
}
