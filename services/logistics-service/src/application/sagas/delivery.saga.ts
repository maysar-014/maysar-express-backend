import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import {
  ICourierRepository,
  IRouteRepository
} from '../../domain/repositories';
import { RealTimeTrackingPort } from '../../domain/engines/ports/tracking.port';
import { CourierDomainService } from '../../domain/services/courier.domain-service';
import { RouteCreationService } from '../../domain/services/route-creation.service';
import { CourierEntity } from '../../domain/entities/courier.entity';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import {
  CourierAssignedEvent,
  DeliveryPickedUpEvent,
  DeliveryInTransitEvent,
  DeliveryDeliveredEvent,
  DeliveryCancelledEvent
} from '../../domain/events/delivery.events';

export interface DeliverySagaContext {
  deliveryId: string;
  orderId: string;
  buyerId?: string;
  paymentMethod?: string;
  courierId?: string;
  pickupLocation: { lat: number; lng: number; address: string };
  deliveryLocation: { lat: number; lng: number; address: string };
  status: 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  compensationActions?: string[];
  requestId?: string;
}

/**
 * Delivery Saga - Constitution Section 7: Compensation Completeness Rule
 */
export class DeliverySaga extends DistributedSagaOrchestrator<DeliverySagaContext> {
  protected sagaType = 'DeliverySaga';

  constructor(
    sagaLogRepository: ISagaLogRepository,
    serviceName: string,
    private readonly courierRepository: ICourierRepository,
    private readonly trackingPort: RealTimeTrackingPort,
    private readonly routeRepository?: IRouteRepository,
    private readonly routeCreationService?: RouteCreationService,
    private readonly courierDomainService?: CourierDomainService,
    outbox?: any
  ) {
    super(sagaLogRepository, serviceName, outbox);
  }

  protected defineSteps(): SagaStep<DeliverySagaContext>[] {
    return [
      {
        name: 'assign_courier',
        execute: async (context: DeliverySagaContext, sagaId: string) => {
          console.log(`[${sagaId}] Starting courier assignment for delivery ${context.deliveryId}`);

          const availableCouriers = await this.courierRepository.findAvailableCouriers(
            {
              lat: context.pickupLocation.lat,
              lng: context.pickupLocation.lng,
              address: context.pickupLocation.address
            } as any,
            50
          );

          if (availableCouriers.length === 0) {
            throw new Error('No couriers available for delivery');
          }

          const selectedCourier = availableCouriers[0];
          await this.courierRepository.assignCourier(context.deliveryId, selectedCourier.id);

          context.courierId = selectedCourier.id;
          context.status = 'assigned';
          context.assignedAt = new Date();

          const pickupLocation = GeoPoint.create(
            context.pickupLocation.lat,
            context.pickupLocation.lng,
            context.pickupLocation.address
          );

          let estimatedArrival: Date;
          if (this.courierDomainService) {
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
            const fallbackMinutes = selectedCourier.trafficExperience > 0.8 ? 12 : 15;
            estimatedArrival = new Date(Date.now() + fallbackMinutes * 60000);
          }

          if (this.routeCreationService && this.routeRepository) {
            try {
              const deliveryForRoute = {
                id: context.deliveryId,
                pickupLocation,
                deliveryLocation: GeoPoint.create(
                  context.deliveryLocation.lat,
                  context.deliveryLocation.lng,
                  context.deliveryLocation.address
                ),
                weight: Weight.fromKilograms(1.0),
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

              await this.routeRepository.save(routeResult.route);
            } catch (routeError) {
              console.warn(`[${sagaId}] Failed to create route for delivery ${context.deliveryId}:`, routeError);
            }
          }

          await (this as any).publishCommand('CourierAssigned', {
            courierId: selectedCourier.id,
            courierName: selectedCourier.name,
            vehicleType: selectedCourier.vehicle.type,
            estimatedArrival
          }, context.requestId || sagaId, sagaId);
        },
        compensate: async (context: DeliverySagaContext, sagaId: string) => {
          await (this as any).publishCommand('Delivery.Failure.v1', {
            sagaId,
            orderId: context.orderId,
            deliveryId: context.deliveryId,
            buyerId: context.buyerId,
            paymentMethod: context.paymentMethod,
            isCOD: context.paymentMethod === 'COD',
            reason: context.courierId ? 'Courier assignment failed' : 'No couriers available'
          }, context.requestId || sagaId, sagaId);

          if (!context.courierId) return;

          await this.courierRepository.updateCourierAvailability(context.courierId, true);

          await (this as any).publishCommand('DeliveryCancelled', {
            cancelledBy: 'system',
            reason: 'saga_compensation_unassign_courier'
          }, context.requestId || sagaId, sagaId);

          context.courierId = undefined;
          context.status = 'cancelled';
        }
      },
      {
        name: 'wait_for_pickup',
        execute: async (context: DeliverySagaContext, sagaId: string) => {
          console.log(`[${sagaId}] Waiting for pickup simulation...`);
          await new Promise(resolve => setTimeout(resolve, 2000));

          context.status = 'picked_up';
          context.pickedUpAt = new Date();

          await (this as any).publishCommand('DeliveryPickedUp', {
            courierId: context.courierId!,
            pickupTime: context.pickedUpAt
          }, context.requestId || sagaId, sagaId);
        },
        compensate: async (context: DeliverySagaContext, sagaId: string) => {
          context.status = 'cancelled';
          context.pickedUpAt = undefined;

          await (this as any).publishCommand('DeliveryCancelled', {
            cancelledBy: 'system',
            reason: 'saga_compensation_pickup_cancelled'
          }, context.requestId || sagaId, sagaId);
        }
      },
      {
        name: 'track_delivery',
        execute: async (context: DeliverySagaContext, sagaId: string) => {
          context.status = 'in_transit';

          await (this as any).publishCommand('DeliveryInTransit', {
            courierId: context.courierId!,
            route: {
              waypoints: [
                { lat: context.pickupLocation.lat, lng: context.pickupLocation.lng, type: 'pickup' },
                { lat: context.deliveryLocation.lat, lng: context.deliveryLocation.lng, type: 'delivery' }
              ],
              estimatedDuration: 45
            }
          }, context.requestId || sagaId, sagaId);
        },
        compensate: async (context: DeliverySagaContext, sagaId: string) => {
          // Track Delivery is documented as irreversible historical data
          console.log(`[${sagaId}] Compensation for track_delivery: historical tracking data remains.`);
        }
      },
      {
        name: 'confirm_delivery',
        execute: async (context: DeliverySagaContext, sagaId: string) => {
          console.log(`[${sagaId}] Confirming delivery...`);
          await new Promise(resolve => setTimeout(resolve, 1000));

          context.status = 'delivered';
          context.deliveredAt = new Date();

          await (this as any).publishCommand('DeliveryDelivered', {
            courierId: context.courierId!,
            deliveryTime: context.deliveredAt
          }, context.requestId || sagaId, sagaId);

          await (this as any).publishCommand('Delivery.Success.v1', {
            sagaId,
            orderId: context.orderId,
            deliveryId: context.deliveryId,
            buyerId: context.buyerId,
            paymentMethod: context.paymentMethod,
            isCOD: context.paymentMethod === 'COD',
            deliveredAt: context.deliveredAt
          }, context.requestId || sagaId, sagaId);
        },
        compensate: async (context: DeliverySagaContext, sagaId: string) => {
          // Confirm Delivery is documented as irreversible business completion
          console.log(`[${sagaId}] Compensation for confirm_delivery: delivery completion remains.`);
        }
      }
    ];
  }
}

