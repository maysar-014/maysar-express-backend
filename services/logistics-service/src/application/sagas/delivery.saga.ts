import { BaseSaga, SagaContext } from './base.saga';
import { SagaRegistry } from './saga-registry';
import { CourierRepositoryPort } from '../../domain/engines/ports/courier.port';
import { RealTimeTrackingPort } from '../../domain/engines/ports/tracking.port';
import { RouteRepositoryPort } from '../../domain/engines/ports/route.port';
import { CourierDomainService } from '../../domain/services/courier.domain-service';
import { RouteCreationService } from '../../domain/services/route-creation.service';
import { CourierEntity } from '../../domain/entities/courier.entity';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import {
  DeliveryRequestedEvent,
  DeliveryEvent,
  CourierAssignedEvent,
  DeliveryPickedUpEvent,
  DeliveryInTransitEvent,
  DeliveryDeliveredEvent,
  DeliveryFailedEvent,
  DeliveryCancelledEvent
} from '../../domain/events/delivery.events';

interface DeliverySagaData {
  deliveryId: string;
  orderId: string;
  courierId?: string;
  pickupLocation: { lat: number; lng: number; address: string };
  deliveryLocation: { lat: number; lng: number; address: string };
  status: 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  compensationActions: string[];
}

/**
 * Delivery Saga - Constitution Section 7: Compensation Completeness Rule
 *
 * Every saga step must satisfy one of the following:
 * 1. Has a compensating action
 * 2. Is explicitly documented as irreversible
 *
 * Compensation Strategy:
 * - assignCourier → unassignCourier (compensation)
 * - waitForPickup → cancelPickup (compensation)
 * - trackDelivery → DOCUMENTED AS IRREVERSIBLE (tracking data cannot be "untracked")
 * - confirmDelivery → DOCUMENTED AS IRREVERSIBLE (delivery completion cannot be "undone")
 */
export class DeliverySaga extends BaseSaga<DeliverySagaData> {
  constructor(
    private courierPort: CourierRepositoryPort,
    private trackingPort: RealTimeTrackingPort,
    private routeRepository?: RouteRepositoryPort,
    private routeCreationService?: RouteCreationService,
    private courierDomainService?: CourierDomainService
  ) {
    super();

    // Define saga steps with their compensations per Section 7
    this.defineSteps();
  }

  private defineSteps(): void {
    // Step 1: Assign courier - compensable by unassignment
    this.step('assignCourier', () => this.assignCourier(this.context!.data));
    this.addCompensation('assignCourier', () => this.unassignCourier(this.context!.data));

    // Step 2: Wait for pickup - compensable by cancellation
    this.step('waitForPickup', () => this.waitForPickup(this.context!.data));
    this.addCompensation('waitForPickup', () => this.cancelPickup(this.context!.data));

    // Step 3: Track delivery - IRREVERSIBLE (Section 7 compliance)
    // Tracking data cannot be "untracked" - once location data is stored,
    // it represents historical fact that cannot be erased
    this.step('trackDelivery', () => this.trackDelivery(this.context!.data));
    // No compensation - explicitly documented as irreversible

    // Step 4: Confirm delivery - IRREVERSIBLE (Section 7 compliance)
    // Delivery completion represents business completion that cannot be undone
    this.step('confirmDelivery', () => this.confirmDelivery(this.context!.data));
    // No compensation - explicitly documented as irreversible
  }

  async execute(context: SagaContext<DeliverySagaData>): Promise<void> {
    const { data } = context;

    try {
      // Execute steps in order - compensations are automatically handled on failure
      await this.executeStep(this.steps.find(s => s.name === 'assignCourier')!);
      await this.executeStep(this.steps.find(s => s.name === 'waitForPickup')!);
      await this.executeStep(this.steps.find(s => s.name === 'trackDelivery')!);
      await this.executeStep(this.steps.find(s => s.name === 'confirmDelivery')!);

    } catch (error) {
      throw error;
    }
  }

  private async assignCourier(data: DeliverySagaData): Promise<void> {
    // Find available couriers near pickup location
    const availableCouriers = await this.courierPort.findAvailableCouriers(
      {
        lat: data.pickupLocation.lat,
        lng: data.pickupLocation.lng,
        address: data.pickupLocation.address
      } as any, // TODO: Fix type
      50
    );

    if (availableCouriers.length === 0) {
      throw new Error('No couriers available for delivery');
    }

    // Select the first available courier (in real implementation, use policy)
    const selectedCourier = availableCouriers[0];

    // Assign courier to delivery
    await this.courierPort.assignCourier(data.deliveryId, selectedCourier.id);

    // Update saga data
    data.courierId = selectedCourier.id;
    data.status = 'assigned';
    data.assignedAt = new Date();

    // Calculate estimated arrival time dynamically
    const pickupLocation = GeoPoint.create(
      data.pickupLocation.lat,
      data.pickupLocation.lng,
      data.pickupLocation.address
    );

    let estimatedArrival: Date;
    if (this.courierDomainService) {
      // Convert interface to entity for domain service
      const courierEntity = CourierEntity.create({
        id: selectedCourier.id,
        name: selectedCourier.name,
        phone: selectedCourier.phone,
        vehicle: selectedCourier.vehicle,
        rating: selectedCourier.rating,
        completionRate: selectedCourier.completionRate,
        currentLocation: selectedCourier.currentLocation,
        isAvailable: selectedCourier.isAvailable,
        trafficExperience: selectedCourier.trafficExperience
      });

      const arrivalResult = await this.courierDomainService.calculateEstimatedArrivalTime(
        courierEntity,
        pickupLocation
      );
      estimatedArrival = new Date(Date.now() + arrivalResult.estimatedMinutes * 60000);
    } else {
      // Fallback to static calculation if service not available
      const fallbackMinutes = selectedCourier.trafficExperience > 0.8 ? 12 : 15;
      estimatedArrival = new Date(Date.now() + fallbackMinutes * 60000);
    }

    // Create route for the delivery (Business Logic Integration)
    if (this.routeCreationService && this.routeRepository) {
      try {
        const deliveryForRoute = {
          id: data.deliveryId,
          pickupLocation,
          deliveryLocation: GeoPoint.create(
            data.deliveryLocation.lat,
            data.deliveryLocation.lng,
            data.deliveryLocation.address
          ),
          weight: Weight.fromKilograms(1.0), // TODO: Get actual weight from delivery data
          priority: 'standard' as const
        };

        const routeResult = await this.routeCreationService.createRouteForSingleDelivery(
          CourierEntity.create({
            id: selectedCourier.id,
            name: selectedCourier.name,
            phone: selectedCourier.phone,
            vehicle: selectedCourier.vehicle,
            rating: selectedCourier.rating,
            completionRate: selectedCourier.completionRate,
            currentLocation: selectedCourier.currentLocation,
            isAvailable: selectedCourier.isAvailable,
            trafficExperience: selectedCourier.trafficExperience
          }),
          deliveryForRoute
        );

        // Save the route to repository
        await this.routeRepository.save(routeResult.route);

        console.log(`✅ Route created for delivery ${data.deliveryId}:`, {
          routeId: routeResult.route.getId(),
          optimizationScore: routeResult.optimizationScore,
          savings: routeResult.estimatedSavings
        });

      } catch (routeError) {
        console.warn(`⚠️ Failed to create route for delivery ${data.deliveryId}:`, routeError);
        // Continue with delivery assignment even if route creation fails
      }
    }

    // Publish courier assigned event
    const event: CourierAssignedEvent = {
      eventType: 'CourierAssigned',
      eventVersion: 'v1',
      eventId: this.generateEventId(),
      aggregateId: data.deliveryId,
      occurredAt: new Date(),
      data: {
        courierId: selectedCourier.id,
        courierName: selectedCourier.name,
        vehicleType: selectedCourier.vehicle.type,
        estimatedArrival
      }
    };

    await this.publishEvent('CourierAssigned', event);
  }

  private async waitForPickup(data: DeliverySagaData): Promise<void> {
    // In a real implementation, this would wait for a timeout or external event
    // For now, we'll simulate pickup after a delay
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

    data.status = 'picked_up';
    data.pickedUpAt = new Date();

    const event: DeliveryPickedUpEvent = {
      eventType: 'DeliveryPickedUp',
      eventVersion: 'v1',
      eventId: this.generateEventId(),
      aggregateId: data.deliveryId,
      occurredAt: new Date(),
      data: {
        courierId: data.courierId!,
        pickupTime: data.pickedUpAt
      }
    };

    await this.publishEvent('DeliveryPickedUp', event);
  }

  private async trackDelivery(data: DeliverySagaData): Promise<void> {
    data.status = 'in_transit';

    const event: DeliveryInTransitEvent = {
      eventType: 'DeliveryInTransit',
      eventVersion: 'v1',
      eventId: this.generateEventId(),
      aggregateId: data.deliveryId,
      occurredAt: new Date(),
      data: {
        courierId: data.courierId!,
        route: {
          waypoints: [
            { lat: data.pickupLocation.lat, lng: data.pickupLocation.lng, type: 'pickup' },
            { lat: data.deliveryLocation.lat, lng: data.deliveryLocation.lng, type: 'delivery' }
          ],
          estimatedDuration: 45
        }
      }
    };

    await this.publishEvent('DeliveryInTransit', event);
  }

  private async confirmDelivery(data: DeliverySagaData): Promise<void> {
    // In a real implementation, this would wait for delivery confirmation
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

    data.status = 'delivered';
    data.deliveredAt = new Date();

    const event: DeliveryDeliveredEvent = {
      eventType: 'DeliveryDelivered',
      eventVersion: 'v1',
      eventId: this.generateEventId(),
      aggregateId: data.deliveryId,
      occurredAt: data.deliveredAt,
      data: {
        courierId: data.courierId!,
        deliveryTime: data.deliveredAt
      }
    };

    await this.publishEvent('DeliveryDelivered', event);
  }

  /**
   * Compensation for assignCourier step (Section 7 compliance)
   * Unassigns the courier from the delivery
   */
  private async unassignCourier(data: DeliverySagaData): Promise<void> {
    if (!data.courierId) return;

    // Unassign courier from delivery
    await this.courierPort.updateCourierAvailability(data.courierId, true);

    // Publish unassignment event
    const event: DeliveryCancelledEvent = {
      eventType: 'DeliveryCancelled',
      eventVersion: 'v1',
      eventId: this.generateEventId(),
      aggregateId: data.deliveryId,
      occurredAt: new Date(),
      data: {
        cancelledBy: 'system',
        reason: 'saga_compensation_unassign_courier'
      }
    };

    await this.publishEvent('DeliveryCancelled', event);

    // Update saga data
    data.courierId = undefined;
    data.status = 'cancelled';
    data.compensationActions.push('unassignCourier');
  }

  /**
   * Compensation for waitForPickup step (Section 7 compliance)
   * Cancels the pickup process
   */
  private async cancelPickup(data: DeliverySagaData): Promise<void> {
    // Cancel pickup notification and reset status
    data.status = 'cancelled';
    data.pickedUpAt = undefined;

    // Publish cancellation event
    const event: DeliveryCancelledEvent = {
      eventType: 'DeliveryCancelled',
      eventVersion: 'v1',
      eventId: this.generateEventId(),
      aggregateId: data.deliveryId,
      occurredAt: new Date(),
      data: {
        cancelledBy: 'system',
        reason: 'saga_compensation_pickup_cancelled'
      }
    };

    await this.publishEvent('DeliveryCancelled', event);
    data.compensationActions.push('cancelPickup');
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function to create delivery sagas
export function createDeliverySaga(
  courierPort: CourierRepositoryPort,
  trackingPort: RealTimeTrackingPort
): DeliverySaga {
  return new DeliverySaga(courierPort, trackingPort);
}
