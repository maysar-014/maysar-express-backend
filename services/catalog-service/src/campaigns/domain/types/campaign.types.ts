export enum CampaignType {
    DISCOUNT = 'DISCOUNT',
    PROMOTION = 'PROMOTION',
    CLEARANCE = 'CLEARANCE',
    SEASONAL = 'SEASONAL',
}

export enum CampaignStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum RuleType {
    FIXED_DISCOUNT = 'FIXED_DISCOUNT',
    PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
    FIXED_PRICE = 'FIXED_PRICE',
    BUY_GET = 'BUY_GET',
}

export enum ConditionType {
    MIN_ORDER_VALUE = 'MIN_ORDER_VALUE',
    MAX_USES_PER_CUSTOMER = 'MAX_USES_PER_CUSTOMER',
    CUSTOMER_SEGMENT = 'CUSTOMER_SEGMENT',
    GEOGRAPHIC_REGION = 'GEOGRAPHIC_REGION',
}

export enum OperatorType {
    EQUALS = 'EQUALS',
    GREATER_THAN = 'GREATER_THAN',
    LESS_THAN = 'LESS_THAN',
    IN = 'IN',
    CONTAINS = 'CONTAINS',
}

export interface ICampaignMetadata {
    [key: string]: unknown;
}
