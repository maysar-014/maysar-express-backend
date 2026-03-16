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
import { CourierAssignmentPolicy } from '../../domain/policies/courier-assignment.policy';
import { CourierAssignmentService } from '../services/courier-assignment.service';
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
  weight?: number;
  priority?: 'standard' | 'express' | 'urgent';
  specialRequirements?: string[];
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
    private readonly courierAssignmentService?: CourierAssignmentService,
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

          const pickupLocation = GeoPoint.create(
            context.pickupLocation.lat,
            context.pickupLocation.lng,
            context.pickupLocation.address
          );
          const deliveryLocation = GeoPoint.create(
            context.deliveryLocation.lat,
            context.deliveryLocation.lng,
            context.deliveryLocation.address
          );

          const criteria = {
            pickupLocation,
            deliveryLocation,
            weight: Weight.fromKilograms(context.weight ?? 1.0),
            priority: context.priority ?? 'standard',
            specialRequirements: context.specialRequirements
          };

          let selectedCourier: CourierEntity;
          let estimatedArrival: Date;

          if (this.courierAssignmentService) {
            const assignment = await this.courierAssignmentService.assignCourier({
              deliveryId: context.deliveryId,
              pickupLocation,
              deliveryLocation,
              weight: criteria.weight,
              priority: criteria.priority,
              specialRequirements: criteria.specialRequirements
            });
            selectedCourier = assignment.courier;
            estimatedArrival = assignment.estimatedArrival;
          } else {
            const availableCouriers = await this.courierRepository.findAvailableCouriers(
              {
                lat: context.pickupLocation.lat,
                lng: context.pickupLocation.lng,
                address: context.pickupLocation.address
              } as any,
              50
            );

            if (availableCouriers.length === 0) {
              context.status = 'cancelled';
              throw new Error('No couriers available for delivery');
            }

            const assignmentPolicy = new CourierAssignmentPolicy();
            const courierEntities = availableCouriers.map(courier =>
              CourierEntity.create({
                id: courier.id,
                name: courier.name,
                phone: courier.phone,
                vehicle: courier.vehicle,
                rating: courier.rating,
                completionRate: courier.completionRate,
                currentLocation: courier.currentLocation,
                status: (courier as any).status,
                isAvailable: courier.isAvailable,
                trafficExperience: courier.trafficExperience
              })
            );

            const selectedEntity = assignmentPolicy.selectOptimalCourier(courierEntities, criteria);
            const fallbackCourier =
              (selectedEntity && availableCouriers.find(courier => courier.id === selectedEntity.id)) ||
              availableCouriers[0];

            if (!selectedEntity && availableCouriers.length > 1) {
              console.warn(`[${sagaId}] Courier selection policy did not pick a courier; falling back to first available.`);
            }

            await this.courierRepository.assignCourier(context.deliveryId, fallbackCourier.id);

            selectedCourier = CourierEntity.create({
              id: fallbackCourier.id,
              name: fallbackCourier.name,
              phone: fallbackCourier.phone,
              vehicle: fallbackCourier.vehicle,
              rating: fallbackCourier.rating,
              completionRate: fallbackCourier.completionRate,
              currentLocation: fallbackCourier.currentLocation,
              status: (fallbackCourier as any).status,
              isAvailable: fallbackCourier.isAvailable,
              trafficExperience: fallbackCourier.trafficExperience
            });

            if (this.courierDomainService) {
              const arrivalResult = await this.courierDomainService.calculateEstimatedArrivalTime(
                selectedCourier,
                pickupLocation
              );
              estimatedArrival = new Date(Date.now() + arrivalResult.estimatedMinutes * 60000);
            } else {
              const fallbackMinutes = selectedCourier.trafficExperience > 0.8 ? 12 : 15;
              estimatedArrival = new Date(Date.now() + fallbackMinutes * 60000);
            }
          }

          context.courierId = selectedCourier.id;
          context.status = 'assigned';
          context.assignedAt = new Date();

          if (this.routeCreationService && this.routeRepository) {
            try {
            const deliveryForRoute = {
              id: context.deliveryId,
              pickupLocation,
              deliveryLocation,
              weight: criteria.weight,
              priority: criteria.priority
            };

              const routeResult = await this.routeCreationService.createRouteForSingleDelivery(
                selectedCourier,
                deliveryForRoute
              );

              await this.routeRepository.save(routeResult.route);
            } catch (routeError) {
              console.warn(`[${sagaId}] Failed to create route for delivery ${context.deliveryId}:`, routeError);
            }
          }

          await (this as any).publishCommand('CourierAssigned', {
            deliveryId: context.deliveryId,
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

          context.status = 'cancelled';
          if (!context.courierId) return;

          await this.courierRepository.updateCourierAvailability(context.courierId, true);

          await (this as any).publishCommand('DeliveryCancelled', {
            deliveryId: context.deliveryId,
            cancelledBy: 'system',
            reason: 'saga_compensation_unassign_courier'
          }, context.requestId || sagaId, sagaId);

          context.courierId = undefined;
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
            deliveryId: context.deliveryId,
            courierId: context.courierId!,
            pickupTime: context.pickedUpAt
          }, context.requestId || sagaId, sagaId);
        },
        compensate: async (context: DeliverySagaContext, sagaId: string) => {
          context.status = 'cancelled';
          context.pickedUpAt = undefined;

          await (this as any).publishCommand('DeliveryCancelled', {
            deliveryId: context.deliveryId,
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
            deliveryId: context.deliveryId,
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
          // DOCUMENTED AS IRREVERSIBLE: tracking data is historical and cannot be undone
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
            deliveryId: context.deliveryId,
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
          // DOCUMENTED AS IRREVERSIBLE: delivery completion is a business record
          console.log(`[${sagaId}] Compensation for confirm_delivery: delivery completion remains.`);
        }
      }
    ];
  }
}

