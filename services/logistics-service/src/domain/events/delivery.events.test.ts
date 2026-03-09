import {
  createDeliveryRequestedEvent,
  createCourierAssignedEvent,
  createDeliveryPickedUpEvent,
  createDeliveryInTransitEvent,
  createDeliveryDeliveredEvent,
  createDeliveryFailedEvent,
  createDeliveryCancelledEvent
} from './delivery.events';

describe('delivery.events factories', () => {
  const base = {
    eventVersion: 'v1' as const,
    eventId: 'evt-1',
    aggregateId: 'del-1',
    occurredAt: new Date('2026-03-08T10:00:00.000Z')
  };

  it('creates immutable DeliveryRequested and CourierAssigned events', () => {
    const requested = createDeliveryRequestedEvent({
      ...base,
      data: {
        orderId: 'ord-1',
        pickupLocation: { lat: -6.79, lng: 39.2, address: 'A' },
        deliveryLocation: { lat: -6.8, lng: 39.21, address: 'B' },
        weight: 5,
        priority: 'express'
      }
    });
    const assigned = createCourierAssignedEvent({
      ...base,
      data: {
        courierId: 'cour-1',
        courierName: 'Courier',
        vehicleType: 'bike',
        estimatedArrival: new Date('2026-03-08T10:30:00.000Z')
      }
    });

    expect(requested.eventType).toBe('DeliveryRequested');
    expect(assigned.eventType).toBe('CourierAssigned');
    expect(Object.isFrozen(requested)).toBe(true);
    expect(Object.isFrozen(assigned)).toBe(true);
  });

  it('creates immutable pickup/in-transit/delivered events', () => {
    const pickedUp = createDeliveryPickedUpEvent({
      ...base,
      data: { courierId: 'cour-1', pickupTime: new Date('2026-03-08T10:10:00.000Z') }
    });
    const inTransit = createDeliveryInTransitEvent({
      ...base,
      data: {
        courierId: 'cour-1',
        route: {
          waypoints: [{ lat: -6.79, lng: 39.2, type: 'pickup' }],
          estimatedDuration: 20
        }
      }
    });
    const delivered = createDeliveryDeliveredEvent({
      ...base,
      data: { courierId: 'cour-1', deliveryTime: new Date('2026-03-08T10:30:00.000Z') }
    });

    expect(pickedUp.eventType).toBe('DeliveryPickedUp');
    expect(inTransit.eventType).toBe('DeliveryInTransit');
    expect(delivered.eventType).toBe('DeliveryDelivered');
    expect(Object.isFrozen(pickedUp)).toBe(true);
    expect(Object.isFrozen(inTransit)).toBe(true);
    expect(Object.isFrozen(delivered)).toBe(true);
  });

  it('creates immutable failure and cancellation events', () => {
    const failed = createDeliveryFailedEvent({
      ...base,
      data: {
        courierId: 'cour-1',
        failureReason: 'address not found',
        failureType: 'wrong_address',
        retryPossible: true
      }
    });
    const cancelled = createDeliveryCancelledEvent({
      ...base,
      data: {
        cancelledBy: 'customer',
        reason: 'no longer needed',
        refundAmount: 5000
      }
    });

    expect(failed.eventType).toBe('DeliveryFailed');
    expect(cancelled.eventType).toBe('DeliveryCancelled');
    expect(failed.data.retryPossible).toBe(true);
    expect(cancelled.data.refundAmount).toBe(5000);
    expect(Object.isFrozen(failed)).toBe(true);
    expect(Object.isFrozen(cancelled)).toBe(true);
  });
});
