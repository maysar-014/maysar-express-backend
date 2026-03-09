import { DeliveryStatus } from './delivery-status.enum';

describe('DeliveryStatus enum', () => {
  it('contains expected lifecycle statuses', () => {
    expect(DeliveryStatus.ASSIGNED).toBe('assigned');
    expect(DeliveryStatus.PICKED_UP).toBe('picked_up');
    expect(DeliveryStatus.IN_TRANSIT).toBe('in_transit');
    expect(DeliveryStatus.DELIVERED).toBe('delivered');
    expect(DeliveryStatus.CANCELLED).toBe('cancelled');
  });
});
