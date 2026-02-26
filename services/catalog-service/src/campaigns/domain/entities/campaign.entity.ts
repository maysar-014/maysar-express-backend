import { CampaignType, CampaignStatus } from '../types/campaign.types';
import { CampaignSchedule } from '../value-objects/campaign-schedule.value-object';
import { CampaignMetadata } from '../value-objects/campaign-metadata.value-object';
import { CampaignPricingRule } from './campaign-pricing-rule.entity';
import { CampaignCondition } from './campaign-condition.entity';
import { CampaignValidationError } from '../errors/campaign.errors';

export class Campaign {
    private constructor(
        private readonly id: string,
        private name: string,
        private description: string | undefined,
        private readonly type: CampaignType,
        private status: CampaignStatus,
        private schedule: CampaignSchedule,
        private readonly sellerId: string,
        private readonly createdBy: string,
        private metadata: CampaignMetadata,
        private pricingRules: CampaignPricingRule[] = [],
        private conditions: CampaignCondition[] = [],
        private productIds: string[] = [],
        private categoryIds: string[] = [],
        private readonly createdAt: Date = new Date(),
        private updatedAt: Date = new Date()
    ) { }

    getId(): string { return this.id; }
    getName(): string { return this.name; }
    getDescription(): string | undefined { return this.description; }
    getType(): CampaignType { return this.type; }
    getStatus(): CampaignStatus { return this.status; }
    getSchedule(): CampaignSchedule { return this.schedule; }
    getSellerId(): string { return this.sellerId; }
    getCreatedBy(): string { return this.createdBy; }
    getMetadata(): CampaignMetadata { return this.metadata; }
    getPricingRules(): CampaignPricingRule[] { return [...this.pricingRules]; }
    getConditions(): CampaignCondition[] { return [...this.conditions]; }
    getProductIds(): string[] { return [...this.productIds]; }
    getCategoryIds(): string[] { return [...this.categoryIds]; }
    getCreatedAt(): Date { return this.createdAt; }
    getUpdatedAt(): Date { return this.updatedAt; }

    static create(
        id: string,
        name: string,
        type: CampaignType,
        schedule: CampaignSchedule,
        sellerId: string,
        createdBy: string,
        description?: string,
        metadata?: CampaignMetadata
    ): Campaign {
        if (!name.trim()) throw new CampaignValidationError('Campaign name cannot be empty');

        return new Campaign(
            id,
            name,
            description,
            type,
            CampaignStatus.DRAFT,
            schedule,
            sellerId,
            createdBy,
            metadata ?? CampaignMetadata.create()
        );
    }

    schedule_campaign(): void {
        if (this.status !== CampaignStatus.DRAFT) {
            throw new CampaignValidationError('Only draft campaigns can be scheduled');
        }
        this.status = CampaignStatus.SCHEDULED;
        this.updatedAt = new Date();
    }

    launch(): void {
        if (this.status !== CampaignStatus.DRAFT && this.status !== CampaignStatus.SCHEDULED) {
            throw new CampaignValidationError('Only draft or scheduled campaigns can be launched');
        }
        this.status = CampaignStatus.ACTIVE;
        this.updatedAt = new Date();
    }

    pause(): void {
        if (this.status !== CampaignStatus.ACTIVE) {
            throw new CampaignValidationError('Only active campaigns can be paused');
        }
        this.status = CampaignStatus.PAUSED;
        this.updatedAt = new Date();
    }

    resume(): void {
        if (this.status !== CampaignStatus.PAUSED) {
            throw new CampaignValidationError('Only paused campaigns can be resumed');
        }
        this.status = CampaignStatus.ACTIVE;
        this.updatedAt = new Date();
    }

    cancel(): void {
        if (this.status === CampaignStatus.COMPLETED) {
            throw new CampaignValidationError('Completed campaigns cannot be cancelled');
        }
        this.status = CampaignStatus.CANCELLED;
        this.updatedAt = new Date();
    }

    complete(): void {
        if (this.status !== CampaignStatus.ACTIVE) {
            throw new CampaignValidationError('Only active campaigns can be marked as completed');
        }
        this.status = CampaignStatus.COMPLETED;
        this.updatedAt = new Date();
    }

    addPricingRule(rule: CampaignPricingRule): void {
        if (this.status !== CampaignStatus.DRAFT) {
            throw new CampaignValidationError('Pricing rules can only be added to draft campaigns');
        }
        this.pricingRules.push(rule);
        this.updatedAt = new Date();
    }

    addCondition(condition: CampaignCondition): void {
        if (this.status !== CampaignStatus.DRAFT) {
            throw new CampaignValidationError('Conditions can only be added to draft campaigns');
        }
        this.conditions.push(condition);
        this.updatedAt = new Date();
    }

    addProduct(productId: string): void {
        if (this.status !== CampaignStatus.DRAFT) {
            throw new CampaignValidationError('Products can only be added to draft campaigns');
        }
        if (!this.productIds.includes(productId)) {
            this.productIds.push(productId);
            this.updatedAt = new Date();
        }
    }

    addCategory(categoryId: string): void {
        if (this.status !== CampaignStatus.DRAFT) {
            throw new CampaignValidationError('Categories can only be added to draft campaigns');
        }
        if (!this.categoryIds.includes(categoryId)) {
            this.categoryIds.push(categoryId);
            this.updatedAt = new Date();
        }
    }

    static reconstitute(
        id: string,
        name: string,
        description: string | undefined,
        type: CampaignType,
        status: CampaignStatus,
        schedule: CampaignSchedule,
        sellerId: string,
        createdBy: string,
        metadata: CampaignMetadata,
        createdAt: Date,
        updatedAt: Date,
        pricingRules: CampaignPricingRule[] = [],
        conditions: CampaignCondition[] = [],
        productIds: string[] = [],
        categoryIds: string[] = []
    ): Campaign {
        return new Campaign(
            id,
            name,
            description,
            type,
            status,
            schedule,
            sellerId,
            createdBy,
            metadata,
            pricingRules,
            conditions,
            productIds,
            categoryIds,
            createdAt,
            updatedAt
        );
    }

    isActive(now: Date = new Date()): boolean {
        return this.status === CampaignStatus.ACTIVE && this.schedule.isActive(now);
    }

    isExpired(now: Date = new Date()): boolean {
        return this.schedule.isExpired(now);
    }
}
