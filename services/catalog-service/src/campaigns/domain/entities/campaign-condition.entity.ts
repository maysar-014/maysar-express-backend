import { ConditionType } from '../types/campaign.types';

export class CampaignCondition {
    constructor(
        private readonly id: string,
        private readonly type: ConditionType,
        private readonly operator: string,
        private readonly value: any,
        private readonly createdAt: Date = new Date()
    ) { }

    getId(): string {
        return this.id;
    }

    getType(): ConditionType {
        return this.type;
    }

    getOperator(): string {
        return this.operator;
    }

    getValue(): any {
        return this.value;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    static create(id: string, type: ConditionType, operator: string, value: any): CampaignCondition {
        return new CampaignCondition(id, type, operator, value);
    }
}
