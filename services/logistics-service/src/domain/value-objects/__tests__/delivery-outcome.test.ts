/**
 * DeliveryOutcome unit tests (MYS-DEL-001 Article 23)
 */

import {
  DELIVERY_OUTCOMES,
  CANCELLATION_OUTCOMES,
  FAILURE_OUTCOMES,
  SUCCESSFUL_OUTCOMES,
  OUTCOME_RESPONSIBLE_PARTY,
  isDeliveryOutcome,
  requiresCostAttribution,
  impliesReturn,
  DeliveryOutcome,
} from '../delivery-outcome';

describe('DELIVERY_OUTCOMES', () => {
  test('contains all 10 constitutional outcomes', () => {
    expect(DELIVERY_OUTCOMES).toHaveLength(10);
  });

  test('all 4 cancellation outcomes are present', () => {
    const cancellations: DeliveryOutcome[] = [
      'CANCELLED_BY_CUSTOMER',
      'CANCELLED_BY_MERCHANT',
      'CANCELLED_BY_DRIVER',
      'CANCELLED_BY_PLATFORM',
    ];
    cancellations.forEach(o => expect(CANCELLATION_OUTCOMES).toContain(o));
  });

  test('all 4 failure outcomes are present', () => {
    const failures: DeliveryOutcome[] = [
      'FAILED_CUSTOMER_UNAVAILABLE',
      'FAILED_MERCHANT_UNAVAILABLE',
      'FAILED_ADDRESS_OR_LOCATION',
      'FAILED_OTHER',
    ];
    failures.forEach(o => expect(FAILURE_OUTCOMES).toContain(o));
  });

  test('COMPLETED is the only successful outcome', () => {
    expect(SUCCESSFUL_OUTCOMES).toEqual(['COMPLETED']);
  });

  test('RETURNED_TO_ORIGIN is distinct from failure outcomes', () => {
    expect(FAILURE_OUTCOMES).not.toContain('RETURNED_TO_ORIGIN');
    expect(DELIVERY_OUTCOMES).toContain('RETURNED_TO_ORIGIN');
  });
});

describe('isDeliveryOutcome()', () => {
  test('returns true for all constitutional outcomes', () => {
    DELIVERY_OUTCOMES.forEach(o => expect(isDeliveryOutcome(o)).toBe(true));
  });

  test('returns false for unknown strings', () => {
    expect(isDeliveryOutcome('failed')).toBe(false);       // legacy flat status
    expect(isDeliveryOutcome('cancelled')).toBe(false);    // legacy flat status
    expect(isDeliveryOutcome('')).toBe(false);
    expect(isDeliveryOutcome('UNKNOWN')).toBe(false);
  });
});

describe('OUTCOME_RESPONSIBLE_PARTY', () => {
  test('COMPLETED is attributed to MAYSAR (normal settlement)', () => {
    expect(OUTCOME_RESPONSIBLE_PARTY['COMPLETED']).toBe('MAYSAR');
  });

  test('CANCELLED_BY_CUSTOMER is attributed to CUSTOMER', () => {
    expect(OUTCOME_RESPONSIBLE_PARTY['CANCELLED_BY_CUSTOMER']).toBe('CUSTOMER');
  });

  test('CANCELLED_BY_MERCHANT is attributed to MERCHANT', () => {
    expect(OUTCOME_RESPONSIBLE_PARTY['CANCELLED_BY_MERCHANT']).toBe('MERCHANT');
  });

  test('CANCELLED_BY_PLATFORM is attributed to MAYSAR', () => {
    expect(OUTCOME_RESPONSIBLE_PARTY['CANCELLED_BY_PLATFORM']).toBe('MAYSAR');
  });

  test('ambiguous outcomes require investigation', () => {
    const investigate: DeliveryOutcome[] = [
      'CANCELLED_BY_DRIVER',
      'FAILED_ADDRESS_OR_LOCATION',
      'FAILED_OTHER',
      'RETURNED_TO_ORIGIN',
    ];
    investigate.forEach(o => expect(OUTCOME_RESPONSIBLE_PARTY[o]).toBe('INVESTIGATE'));
  });

  test('every outcome has a responsible party', () => {
    DELIVERY_OUTCOMES.forEach(o => {
      expect(OUTCOME_RESPONSIBLE_PARTY[o]).toBeDefined();
    });
  });
});

describe('requiresCostAttribution()', () => {
  test('COMPLETED does not require cost attribution', () => {
    expect(requiresCostAttribution('COMPLETED')).toBe(false);
  });

  test('every non-COMPLETED outcome requires cost attribution', () => {
    DELIVERY_OUTCOMES
      .filter(o => o !== 'COMPLETED')
      .forEach(o => expect(requiresCostAttribution(o)).toBe(true));
  });
});

describe('impliesReturn()', () => {
  test('failure outcomes imply return', () => {
    FAILURE_OUTCOMES.forEach(o => expect(impliesReturn(o)).toBe(true));
  });

  test('RETURNED_TO_ORIGIN implies return', () => {
    expect(impliesReturn('RETURNED_TO_ORIGIN')).toBe(true);
  });

  test('COMPLETED does not imply return', () => {
    expect(impliesReturn('COMPLETED')).toBe(false);
  });

  test('cancellation outcomes do not imply return by themselves', () => {
    CANCELLATION_OUTCOMES.forEach(o => expect(impliesReturn(o)).toBe(false));
  });
});
