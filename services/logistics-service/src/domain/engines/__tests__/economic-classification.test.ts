/**
 * EconomicClassification unit tests (MYS-DEL-001 Article 5.5)
 */

import {
  classifyDelivery,
  DeliveryEconomicClassification,
  UnverifiedReason,
} from '../economic-classification';

describe('classifyDelivery', () => {
  const noReasons: UnverifiedReason[] = [];

  test('PROFITABLE when contribution > 0 and no unverified reasons', () => {
    expect(classifyDelivery({
      platformContribution: 500,
      hasAuthorizedSubsidy: false,
      subsidyCoversDeficit: false,
      unverifiedReasons: noReasons,
    })).toBe<DeliveryEconomicClassification>('PROFITABLE');
  });

  test('BREAK_EVEN when contribution === 0 and no unverified reasons', () => {
    expect(classifyDelivery({
      platformContribution: 0,
      hasAuthorizedSubsidy: false,
      subsidyCoversDeficit: false,
      unverifiedReasons: noReasons,
    })).toBe('BREAK_EVEN');
  });

  test('SUBSIDIZED when contribution < 0 and subsidy fully covers deficit', () => {
    expect(classifyDelivery({
      platformContribution: -200,
      hasAuthorizedSubsidy: true,
      subsidyCoversDeficit: true,
      unverifiedReasons: noReasons,
    })).toBe('SUBSIDIZED');
  });

  test('LOSS_MAKING when contribution < 0 and no authorized subsidy', () => {
    expect(classifyDelivery({
      platformContribution: -200,
      hasAuthorizedSubsidy: false,
      subsidyCoversDeficit: false,
      unverifiedReasons: noReasons,
    })).toBe('LOSS_MAKING');
  });

  test('LOSS_MAKING when contribution < 0 and subsidy exists but does not cover deficit', () => {
    expect(classifyDelivery({
      platformContribution: -500,
      hasAuthorizedSubsidy: true,
      subsidyCoversDeficit: false,
      unverifiedReasons: noReasons,
    })).toBe('LOSS_MAKING');
  });

  test('UNVERIFIED overrides everything when reasons are present', () => {
    for (const contribution of [-500, 0, 500]) {
      expect(classifyDelivery({
        platformContribution: contribution,
        hasAuthorizedSubsidy: true,
        subsidyCoversDeficit: true,
        unverifiedReasons: ['DRIVER_COMPENSATION_PLACEHOLDER'],
      })).toBe('UNVERIFIED');
    }
  });

  test('UNVERIFIED with multiple concurrent reasons', () => {
    expect(classifyDelivery({
      platformContribution: 1000,
      hasAuthorizedSubsidy: false,
      subsidyCoversDeficit: false,
      unverifiedReasons: ['DRIVER_COMPENSATION_PLACEHOLDER', 'PAYMENT_COST_UNKNOWN'],
    })).toBe('UNVERIFIED');
  });
});
