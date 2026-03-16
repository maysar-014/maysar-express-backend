import { ICourierRepository } from '../../domain/repositories';
import { CourierSelectionEngine } from '../../domain/engines/courier-selection.engine';
import { CourierAssignmentCriteria } from '../../domain/policies/courier-assignment.policy';
import { CourierDomainService } from '../../domain/services/courier.domain-service';
import { CourierEntity } from '../../domain/entities/courier.entity';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';

export interface CourierAssignmentInput {
  deliveryId: string;
  pickupLocation: GeoPoint;
  deliveryLocation: GeoPoint;
  weight: Weight;
  priority: 'standard' | 'express' | 'urgent';
  specialRequirements?: string[];
  searchRadiusKm?: number;
}

export interface CourierAssignmentResult {
  courier: CourierEntity;
  estimatedArrival: Date;
  selectionReason: string;
}

export class CourierAssignmentService {
  constructor(
    private readonly courierRepository: ICourierRepository,
    private readonly selectionEngine: CourierSelectionEngine,
    private readonly courierDomainService?: CourierDomainService
  ) {}

  async assignCourier(input: CourierAssignmentInput): Promise<CourierAssignmentResult> {
    const radius = input.searchRadiusKm ?? 50;

    const availableCouriers = await this.courierRepository.findAvailableCouriers(input.pickupLocation, radius);
    if (!availableCouriers.length) {
      throw new Error('No couriers available for delivery');
    }

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

    const criteria: CourierAssignmentCriteria = {
      pickupLocation: input.pickupLocation,
      deliveryLocation: input.deliveryLocation,
      weight: input.weight,
      priority: input.priority,
      specialRequirements: input.specialRequirements
    };

    const selection = this.selectionEngine.selectCourier(courierEntities, criteria);
    if (!selection.courier) {
      throw new Error('No suitable courier found for delivery requirements');
    }

    const selectedCourier = selection.courier;

    await this.courierRepository.assignCourier(input.deliveryId, selectedCourier.id);

    let estimatedArrival: Date;
    if (this.courierDomainService) {
      const arrivalResult = await this.courierDomainService.calculateEstimatedArrivalTime(
        selectedCourier,
        input.pickupLocation
      );
      estimatedArrival = new Date(Date.now() + arrivalResult.estimatedMinutes * 60000);
    } else {
      const fallbackMinutes = selectedCourier.trafficExperience > 0.8 ? 12 : 15;
      estimatedArrival = new Date(Date.now() + fallbackMinutes * 60000);
    }

    return {
      courier: selectedCourier,
      estimatedArrival,
      selectionReason: selection.reason
    };
  }
}
