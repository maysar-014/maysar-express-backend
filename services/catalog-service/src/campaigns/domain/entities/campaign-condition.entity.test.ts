import { ConditionType } from '../types/campaign.types';
import { CampaignCondition } from './campaign-condition.entity';

describe('CampaignCondition', () => {
  it('creates condition using constructor and exposes getters', () => {
    const createdAt = new Date('2026-03-09T10:00:00.000Z');
    const condition = new CampaignCondition(
      'cond-1',
      ConditionType.MIN_ORDER_VALUE,
      'GREATER_THAN',
      10000,
      createdAt
    );

    expect(condition.getId()).toBe('cond-1');
    expect(condition.getType()).toBe(ConditionType.MIN_ORDER_VALUE);
    expect(condition.getOperator()).toBe('GREATER_THAN');
    expect(condition.getValue()).toBe(10000);
    expect(condition.getCreatedAt()).toBe(createdAt);
  });

  it('creates condition via static factory', () => {
    const condition = CampaignCondition.create(
      'cond-2',
      ConditionType.CUSTOMER_SEGMENT,
      'IN',
      ['VIP', 'LOYAL']
    );

    expect(condition.getId()).toBe('cond-2');
    expect(condition.getType()).toBe(ConditionType.CUSTOMER_SEGMENT);
    expect(condition.getOperator()).toBe('IN');
    expect(condition.getValue()).toEqual(['VIP', 'LOYAL']);
    expect(condition.getCreatedAt()).toBeInstanceOf(Date);
  });
});

