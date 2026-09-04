/**
 * DeliveryJob transition-event mapping tests (Phase 2 §2.2)
 */

import { mapTransitionEvent } from '../delivery-job-events';

describe('mapTransitionEvent', () => {
  it('maps every backlog event contract', () => {
    expect(mapTransitionEvent('PENDING', 'ASSIGNED')).toBe('DriverAssigned');
    expect(mapTransitionEvent('AT_PICKUP', 'LOADING')).toBe('GoodsLoaded');
    expect(mapTransitionEvent('LOADING', 'IN_TRANSIT')).toBe('ShipmentDeparted');
    expect(mapTransitionEvent('IN_TRANSIT', 'AT_DESTINATION')).toBe('DeliveryAttempted');
    expect(mapTransitionEvent('AT_DESTINATION', 'DELIVERED')).toBe('DeliveryCompleted');
    expect(mapTransitionEvent('DRIVER_ACCEPTED', 'FAILED_PICKUP')).toBe('DeliveryFailed');
    expect(mapTransitionEvent('IN_TRANSIT', 'CUSTOMER_UNAVAILABLE')).toBe('DeliveryFailed');
  });

  it('returns null for transitions with no contract (e.g. DELIVERED → CONFIRMED)', () => {
    expect(mapTransitionEvent('DELIVERED', 'CONFIRMED')).toBeNull();
    expect(mapTransitionEvent('CONFIRMED', 'SETTLED')).toBeNull();
  });

  it('returns null for no-op transitions', () => {
    expect(mapTransitionEvent('PENDING', 'PENDING')).toBeNull();
  });
});