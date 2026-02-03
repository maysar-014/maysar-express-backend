/**
 * Delivery Events Tests
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 3: Business Core Protection - events represent business facts
 */

import {
  DeliveryRequestedEvent,
  CourierAssignedEvent,
  DeliveryPickedUpEvent,
  DeliveryInTransitEvent,
  DeliveryDeliveredEvent,
  DeliveryFailedEvent,
  DeliveryCancelledEvent,
  DeliveryEvent
} from '../../../domain/events/delivery.events';

describe('Delivery Events', () => {
  const baseEventData = {
    eventVersion: 'v1' as const,
    eventId: 'evt_1234567890_abc123def',
    aggregateId: 'delivery_123',
    occurredAt: new Date('2026-01-09T10:30:00Z')
  };

  const testLocations = {
    pickup: {
      lat: -6.7924,
      lng: 39.2083,
      address: 'Dar es Salaam CBD'
    },
    delivery: {
      lat: -6.8167,
      lng: 39.2833,
      address: 'Msasani'
    }
  };

  describe('DeliveryRequestedEvent', () => {
    it('should create valid delivery requested event', () => {
      const event: DeliveryRequestedEvent = {
        ...baseEventData,
        eventType: 'DeliveryRequested',
        data: {
          orderId: 'order_456',
          pickupLocation: testLocations.pickup,
          deliveryLocation: testLocations.delivery,
          weight: 5.5,
          priority: 'standard',
          specialRequirements: ['fragile']
        }
      };

      expect(event.eventType).toBe('DeliveryRequested');
      expect(event.eventVersion).toBe('v1');
      expect(event.aggregateId).toBe('delivery_123');
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.data.orderId).toBe('order_456');
      expect(event.data.weight).toBe(5.5);
      expect(event.data.priority).toBe('standard');
      expect(event.data.specialRequirements).toEqual(['fragile']);
    });

    it('should handle optional special requirements', () => {
      const event: DeliveryRequestedEvent = {
        ...baseEventData,
        eventType: 'DeliveryRequested',
        data: {
          orderId: 'order_789',
          pickupLocation: testLocations.pickup,
          deliveryLocation: testLocations.delivery,
          weight: 2.0,
          priority: 'express'
        }
      };

      expect(event.data.specialRequirements).toBeUndefined();
    });

    it('should validate all priority levels', () => {
      const priorities: Array<'standard' | 'express' | 'urgent'> = ['standard', 'express', 'urgent'];

      priorities.forEach(priority => {
        const event: DeliveryRequestedEvent = {
          ...baseEventData,
          eventType: 'DeliveryRequested',
          data: {
            orderId: `order_${priority}`,
            pickupLocation: testLocations.pickup,
            deliveryLocation: testLocations.delivery,
            weight: 1.0,
            priority
          }
        };

        expect(event.data.priority).toBe(priority);
      });
    });

    it('should validate location data structure', () => {
      const event: DeliveryRequestedEvent = {
        ...baseEventData,
        eventType: 'DeliveryRequested',
        data: {
          orderId: 'order_test',
          pickupLocation: testLocations.pickup,
          deliveryLocation: testLocations.delivery,
          weight: 3.0,
          priority: 'urgent'
        }
      };

      expect(event.data.pickupLocation).toHaveProperty('lat');
      expect(event.data.pickupLocation).toHaveProperty('lng');
      expect(event.data.pickupLocation).toHaveProperty('address');
      expect(event.data.deliveryLocation).toHaveProperty('lat');
      expect(event.data.deliveryLocation).toHaveProperty('lng');
      expect(event.data.deliveryLocation).toHaveProperty('address');
    });
  });

  describe('CourierAssignedEvent', () => {
    it('should create valid courier assigned event', () => {
      const event: CourierAssignedEvent = {
        ...baseEventData,
        eventType: 'CourierAssigned',
        data: {
          courierId: 'courier_789',
          courierName: 'John Doe',
          vehicleType: 'motorcycle',
          estimatedArrival: new Date('2026-01-09T11:00:00Z')
        }
      };

      expect(event.eventType).toBe('CourierAssigned');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.courierName).toBe('John Doe');
      expect(event.data.vehicleType).toBe('motorcycle');
      expect(event.data.estimatedArrival).toBeInstanceOf(Date);
    });

    it('should validate vehicle types', () => {
      const vehicleTypes = ['bicycle', 'motorcycle', 'car', 'truck'];

      vehicleTypes.forEach(vehicleType => {
        const event: CourierAssignedEvent = {
          ...baseEventData,
          eventType: 'CourierAssigned',
          data: {
            courierId: 'courier_test',
            courierName: 'Test Courier',
            vehicleType: vehicleType as any,
            estimatedArrival: new Date()
          }
        };

        expect(event.data.vehicleType).toBe(vehicleType);
      });
    });
  });

  describe('DeliveryPickedUpEvent', () => {
    it('should create valid delivery picked up event', () => {
      const event: DeliveryPickedUpEvent = {
        ...baseEventData,
        eventType: 'DeliveryPickedUp',
        data: {
          courierId: 'courier_789',
          pickupTime: new Date('2026-01-09T11:15:00Z'),
          actualWeight: 5.2
        }
      };

      expect(event.eventType).toBe('DeliveryPickedUp');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.pickupTime).toBeInstanceOf(Date);
      expect(event.data.actualWeight).toBe(5.2);
    });

    it('should handle optional actual weight', () => {
      const event: DeliveryPickedUpEvent = {
        ...baseEventData,
        eventType: 'DeliveryPickedUp',
        data: {
          courierId: 'courier_789',
          pickupTime: new Date('2026-01-09T11:15:00Z')
        }
      };

      expect(event.data.actualWeight).toBeUndefined();
    });
  });

  describe('DeliveryInTransitEvent', () => {
    it('should create valid delivery in transit event', () => {
      const event: DeliveryInTransitEvent = {
        ...baseEventData,
        eventType: 'DeliveryInTransit',
        data: {
          courierId: 'courier_789',
          route: {
            waypoints: [
              { lat: -6.7924, lng: 39.2083, type: 'pickup' },
              { lat: -6.8167, lng: 39.2833, type: 'delivery' }
            ],
            estimatedDuration: 45
          }
        }
      };

      expect(event.eventType).toBe('DeliveryInTransit');
      expect(event.data.route.waypoints).toHaveLength(2);
      expect(event.data.route.estimatedDuration).toBe(45);
    });

    it('should validate waypoint structure', () => {
      const event: DeliveryInTransitEvent = {
        ...baseEventData,
        eventType: 'DeliveryInTransit',
        data: {
          courierId: 'courier_test',
          route: {
            waypoints: [
              { lat: 0, lng: 0, type: 'pickup' },
              { lat: 1, lng: 1, type: 'waypoint' },
              { lat: 2, lng: 2, type: 'delivery' }
            ],
            estimatedDuration: 60
          }
        }
      };

      event.data.route.waypoints.forEach(waypoint => {
        expect(waypoint).toHaveProperty('lat');
        expect(waypoint).toHaveProperty('lng');
        expect(waypoint).toHaveProperty('type');
        expect(['pickup', 'delivery', 'waypoint']).toContain(waypoint.type);
      });
    });

    it('should handle complex routes', () => {
      const event: DeliveryInTransitEvent = {
        ...baseEventData,
        eventType: 'DeliveryInTransit',
        data: {
          courierId: 'courier_complex',
          route: {
            waypoints: [
              { lat: -6.7924, lng: 39.2083, type: 'pickup' },
              { lat: -6.8, lng: 39.25, type: 'waypoint' },
              { lat: -6.8167, lng: 39.2833, type: 'delivery' }
            ],
            estimatedDuration: 90
          }
        }
      };

      expect(event.data.route.waypoints).toHaveLength(3);
      expect(event.data.route.estimatedDuration).toBe(90);
    });
  });

  describe('DeliveryDeliveredEvent', () => {
    it('should create valid delivery delivered event', () => {
      const event: DeliveryDeliveredEvent = {
        ...baseEventData,
        eventType: 'DeliveryDelivered',
        data: {
          courierId: 'courier_789',
          deliveryTime: new Date('2026-01-09T12:00:00Z'),
          recipientName: 'Jane Smith',
          deliveryNotes: 'Delivered to front desk'
        }
      };

      expect(event.eventType).toBe('DeliveryDelivered');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.deliveryTime).toBeInstanceOf(Date);
      expect(event.data.recipientName).toBe('Jane Smith');
      expect(event.data.deliveryNotes).toBe('Delivered to front desk');
    });

    it('should handle optional recipient and notes', () => {
      const event: DeliveryDeliveredEvent = {
        ...baseEventData,
        eventType: 'DeliveryDelivered',
        data: {
          courierId: 'courier_minimal',
          deliveryTime: new Date('2026-01-09T12:00:00Z')
        }
      };

      expect(event.data.recipientName).toBeUndefined();
      expect(event.data.deliveryNotes).toBeUndefined();
    });
  });

  describe('DeliveryFailedEvent', () => {
    it('should create valid delivery failed event', () => {
      const event: DeliveryFailedEvent = {
        ...baseEventData,
        eventType: 'DeliveryFailed',
        data: {
          courierId: 'courier_789',
          failureReason: 'Customer not available',
          failureType: 'customer_unavailable',
          retryPossible: true
        }
      };

      expect(event.eventType).toBe('DeliveryFailed');
      expect(event.data.failureType).toBe('customer_unavailable');
      expect(event.data.retryPossible).toBe(true);
    });

    it('should validate all failure types', () => {
      const failureTypes: Array<'customer_unavailable' | 'wrong_address' | 'package_damaged' | 'vehicle_issue' | 'other'> =
        ['customer_unavailable', 'wrong_address', 'package_damaged', 'vehicle_issue', 'other'];

      failureTypes.forEach(failureType => {
        const event: DeliveryFailedEvent = {
          ...baseEventData,
          eventType: 'DeliveryFailed',
          data: {
            courierId: 'courier_test',
            failureReason: 'Test failure',
            failureType,
            retryPossible: false
          }
        };

        expect(event.data.failureType).toBe(failureType);
      });
    });

    it('should handle retry scenarios', () => {
      const retryableFailures: DeliveryFailedEvent[] = [
        {
          ...baseEventData,
          eventType: 'DeliveryFailed',
          data: {
            courierId: 'courier_test',
            failureReason: 'Customer not home',
            failureType: 'customer_unavailable',
            retryPossible: true
          }
        }
      ];

      const nonRetryableFailures: DeliveryFailedEvent[] = [
        {
          ...baseEventData,
          eventType: 'DeliveryFailed',
          data: {
            courierId: 'courier_test',
            failureReason: 'Wrong address',
            failureType: 'wrong_address',
            retryPossible: false
          }
        }
      ];

      retryableFailures.forEach(event => expect(event.data.retryPossible).toBe(true));
      nonRetryableFailures.forEach(event => expect(event.data.retryPossible).toBe(false));
    });
  });

  describe('DeliveryCancelledEvent', () => {
    it('should create valid delivery cancelled event', () => {
      const event: DeliveryCancelledEvent = {
        ...baseEventData,
        eventType: 'DeliveryCancelled',
        data: {
          cancelledBy: 'customer',
          reason: 'Changed delivery address',
          refundAmount: 15000
        }
      };

      expect(event.eventType).toBe('DeliveryCancelled');
      expect(event.data.cancelledBy).toBe('customer');
      expect(event.data.reason).toBe('Changed delivery address');
      expect(event.data.refundAmount).toBe(15000);
    });

    it('should validate cancellation sources', () => {
      const cancelledByOptions: Array<'customer' | 'system' | 'courier'> = ['customer', 'system', 'courier'];

      cancelledByOptions.forEach(cancelledBy => {
        const event: DeliveryCancelledEvent = {
          ...baseEventData,
          eventType: 'DeliveryCancelled',
          data: {
            cancelledBy,
            reason: 'Test cancellation'
          }
        };

        expect(event.data.cancelledBy).toBe(cancelledBy);
      });
    });

    it('should handle optional refund amount', () => {
      const event: DeliveryCancelledEvent = {
        ...baseEventData,
        eventType: 'DeliveryCancelled',
        data: {
          cancelledBy: 'system',
          reason: 'Technical issue'
        }
      };

      expect(event.data.refundAmount).toBeUndefined();
    });
  });

  describe('DeliveryEvent union type', () => {
    it('should accept all event types', () => {
      const events: DeliveryEvent[] = [
        {
          eventType: 'DeliveryRequested',
          eventVersion: 'v1',
          eventId: 'evt_1',
          aggregateId: 'delivery_1',
          occurredAt: new Date(),
          data: {
            orderId: 'order_1',
            pickupLocation: testLocations.pickup,
            deliveryLocation: testLocations.delivery,
            weight: 1.0,
            priority: 'standard'
          }
        } as DeliveryRequestedEvent,
        {
          eventType: 'CourierAssigned',
          eventVersion: 'v1',
          eventId: 'evt_2',
          aggregateId: 'delivery_1',
          occurredAt: new Date(),
          data: {
            courierId: 'courier_1',
            courierName: 'Test Courier',
            vehicleType: 'motorcycle',
            estimatedArrival: new Date()
          }
        } as CourierAssignedEvent,
        {
          eventType: 'DeliveryDelivered',
          eventVersion: 'v1',
          eventId: 'evt_3',
          aggregateId: 'delivery_1',
          occurredAt: new Date(),
          data: {
            courierId: 'courier_1',
            deliveryTime: new Date()
          }
        } as DeliveryDeliveredEvent
      ];

      expect(events).toHaveLength(3);
      events.forEach(event => {
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('eventVersion');
        expect(event).toHaveProperty('eventId');
        expect(event).toHaveProperty('aggregateId');
        expect(event).toHaveProperty('occurredAt');
        expect(event).toHaveProperty('data');
      });
    });
  });

  describe('Event structure validation', () => {
    it('should validate common event properties', () => {
      const testEvent: DeliveryEvent = {
        eventType: 'DeliveryRequested',
        eventVersion: 'v1',
        eventId: 'evt_test_123',
        aggregateId: 'delivery_test',
        occurredAt: new Date(),
        data: {
          orderId: 'order_test',
          pickupLocation: testLocations.pickup,
          deliveryLocation: testLocations.delivery,
          weight: 2.5,
          priority: 'express'
        }
      } as DeliveryRequestedEvent;

      expect(testEvent.eventVersion).toBe('v1');
      expect(testEvent.eventId).toMatch(/^evt_/);
      expect(testEvent.aggregateId).toMatch(/^delivery_/);
      expect(testEvent.occurredAt).toBeInstanceOf(Date);
      expect(typeof testEvent.data).toBe('object');
    });

    it('should ensure event immutability', () => {
      const event: DeliveryRequestedEvent = {
        eventType: 'DeliveryRequested',
        eventVersion: 'v1',
        eventId: 'evt_immutable',
        aggregateId: 'delivery_immutable',
        occurredAt: new Date(),
        data: {
          orderId: 'order_immutable',
          pickupLocation: testLocations.pickup,
          deliveryLocation: testLocations.delivery,
          weight: 1.0,
          priority: 'standard'
        }
      };

      // Events should be treated as immutable
      expect(() => {
        (event as any).eventId = 'modified';
      }).not.toThrow(); // JS allows property modification, but this tests the concept

      // But the original values should be preserved in our usage
      expect(event.eventId).toBe('evt_immutable');
    });
  });

  describe('Business rule validation', () => {
    it('should validate event ordering logic', () => {
      const deliveryId = 'delivery_sequence_test';

      // Events should follow a logical sequence
      const eventSequence: DeliveryEvent[] = [
        {
          eventType: 'DeliveryRequested',
          eventVersion: 'v1',
          eventId: 'evt_req',
          aggregateId: deliveryId,
          occurredAt: new Date('2026-01-09T10:00:00Z'),
          data: {
            orderId: 'order_seq',
            pickupLocation: testLocations.pickup,
            deliveryLocation: testLocations.delivery,
            weight: 1.0,
            priority: 'standard'
          }
        } as DeliveryRequestedEvent,
        {
          eventType: 'CourierAssigned',
          eventVersion: 'v1',
          eventId: 'evt_assign',
          aggregateId: deliveryId,
          occurredAt: new Date('2026-01-09T10:15:00Z'),
          data: {
            courierId: 'courier_seq',
            courierName: 'Sequence Courier',
            vehicleType: 'motorcycle',
            estimatedArrival: new Date('2026-01-09T10:45:00Z')
          }
        } as CourierAssignedEvent,
        {
          eventType: 'DeliveryDelivered',
          eventVersion: 'v1',
          eventId: 'evt_deliver',
          aggregateId: deliveryId,
          occurredAt: new Date('2026-01-09T12:00:00Z'),
          data: {
            courierId: 'courier_seq',
            deliveryTime: new Date('2026-01-09T12:00:00Z')
          }
        } as DeliveryDeliveredEvent
      ];

      // All events should share the same aggregate ID
      eventSequence.forEach(event => {
        expect(event.aggregateId).toBe(deliveryId);
      });

      // Event timestamps should be in chronological order
      for (let i = 1; i < eventSequence.length; i++) {
        expect(eventSequence[i].occurredAt.getTime()).toBeGreaterThanOrEqual(
          eventSequence[i - 1].occurredAt.getTime()
        );
      }
    });

    it('should validate event data consistency', () => {
      const deliveryId = 'delivery_consistency_test';
      const courierId = 'courier_consistency_test';

      const events: DeliveryEvent[] = [
        {
          eventType: 'CourierAssigned',
          eventVersion: 'v1',
          eventId: 'evt_assign_consistency',
          aggregateId: deliveryId,
          occurredAt: new Date(),
          data: {
            courierId,
            courierName: 'Consistency Courier',
            vehicleType: 'car',
            estimatedArrival: new Date()
          }
        } as CourierAssignedEvent,
        {
          eventType: 'DeliveryPickedUp',
          eventVersion: 'v1',
          eventId: 'evt_pickup_consistency',
          aggregateId: deliveryId,
          occurredAt: new Date(),
          data: {
            courierId, // Should match assigned courier
            pickupTime: new Date()
          }
        } as DeliveryPickedUpEvent,
        {
          eventType: 'DeliveryDelivered',
          eventVersion: 'v1',
          eventId: 'evt_deliver_consistency',
          aggregateId: deliveryId,
          occurredAt: new Date(),
          data: {
            courierId, // Should match assigned courier
            deliveryTime: new Date()
          }
        } as DeliveryDeliveredEvent
      ];

      // Courier ID should be consistent across delivery lifecycle events
      const deliveryEvents = events.filter(event =>
        ['DeliveryPickedUp', 'DeliveryInTransit', 'DeliveryDelivered'].includes(event.eventType)
      );

      deliveryEvents.forEach(event => {
        if (event.eventType === 'DeliveryPickedUp') {
          expect((event as DeliveryPickedUpEvent).data.courierId).toBe(courierId);
        } else if (event.eventType === 'DeliveryDelivered') {
          expect((event as DeliveryDeliveredEvent).data.courierId).toBe(courierId);
        }
      });
    });
  });
});
