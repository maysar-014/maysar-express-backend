import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { RealTimeTrackingEngine, LocationPoint } from '../../domain/engines/real-time-tracking.engine';
import { ITrackingRepository, ICourierRepository, IDeliveryRepository } from '../../domain/repositories';
import { EventPublisherPort } from '../../domain/engines/ports/event-publisher.port';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface TrackingUpdateInput {
  courierId: string;
  deliveryId?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
  };
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  status?: string;
  timestamp?: Date;
  signalStrength?: number;
}

export interface TrackingUpdateResult {
  courierId: string;
  deliveryId?: string;
  stored: boolean;
  estimatedArrival?: Date;
  etaMinutes?: number;
  anomalies?: string[];
}

export class TrackingUpdateService {
  constructor(
    private readonly trackingRepository: ITrackingRepository,
    private readonly courierRepository: ICourierRepository,
    private readonly deliveryRepository: IDeliveryRepository,
    private readonly eventPublisher: EventPublisherPort | null,
    private readonly trackingEngine: RealTimeTrackingEngine
  ) {}

  async handleLocationUpdate(input: TrackingUpdateInput): Promise<TrackingUpdateResult> {
    const timestamp = input.timestamp ?? new Date();
    const geoPoint = GeoPoint.create(
      input.location.latitude,
      input.location.longitude,
      input.location.address || 'Unknown',
      input.location.accuracy
    );

    const locationPoint: LocationPoint = {
      lat: geoPoint.getLatitude(),
      lng: geoPoint.getLongitude(),
      timestamp,
      accuracy: input.location.accuracy ?? 5,
      speed: input.speed,
      heading: input.heading
    };

    const validation = this.trackingEngine.validateLocationData(locationPoint);
    if (!validation.isValid) {
      throw new Error(`Invalid location update: ${validation.violations.join(', ')}`);
    }

    const trackingId = makeId(getModelPrefix('Logistics_LocationHistory'));
    const deliveryId = input.deliveryId ?? undefined;

    const previousTracking = deliveryId
      ? await this.trackingRepository.getLatestTracking(deliveryId)
      : null;

    await this.trackingRepository.save({
      id: trackingId,
      deliveryId: deliveryId ?? '',
      courierId: input.courierId,
      location: geoPoint,
      speed: input.speed ?? 0,
      heading: input.heading ?? 0,
      timestamp,
      status: input.status ?? 'moving',
      batteryLevel: input.batteryLevel,
      accuracy: input.location.accuracy ?? 5
    });

    await this.courierRepository.updateCourierLocation(input.courierId, geoPoint);

    const anomalies: string[] = [];
    if (previousTracking) {
      const jump = this.trackingEngine.detectLocationJump(
        {
          lat: previousTracking.location.getLatitude(),
          lng: previousTracking.location.getLongitude(),
          timestamp: previousTracking.timestamp,
          accuracy: previousTracking.accuracy ?? 5
        },
        locationPoint
      );
      if (jump.isAnomaly) {
        anomalies.push(jump.description);
        await this.publishEvent('Logistics.Tracking.AnomalyDetected.v1', {
          courierId: input.courierId,
          deliveryId,
          type: 'location_jump',
          severity: jump.severity,
          description: jump.description,
          timestamp
        });
      }
    }

    const activeDeliveryId = deliveryId ?? await this.resolveActiveDeliveryId(input.courierId);
    if (activeDeliveryId) {
      const delivery = await this.deliveryRepository.findById(activeDeliveryId);
      if (delivery) {
        const distanceResult = await DistanceCalculationAlgorithm.calculateDeliveryDistance(
          geoPoint,
          delivery.deliveryLocation
        );
        const etaMinutes = distanceResult.duration ?? 0;
        const estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000);

        await this.deliveryRepository.updateEstimatedDeliveryTime(
          delivery.id,
          estimatedArrival,
          distanceResult.distance,
          distanceResult.duration
        );

        await this.publishEvent('Logistics.Delivery.EtaUpdated.v1', {
          deliveryId: delivery.id,
          courierId: input.courierId,
          estimatedArrival,
          etaMinutes,
          distanceKm: distanceResult.distance,
          timestamp
        });

        return {
          courierId: input.courierId,
          deliveryId: delivery.id,
          stored: true,
          estimatedArrival,
          etaMinutes,
          anomalies: anomalies.length ? anomalies : undefined
        };
      }
    }

    await this.publishEvent('Logistics.Courier.LocationUpdated.v1', {
      courierId: input.courierId,
      location: geoPoint.getCoordinates(),
      timestamp
    });

    return {
      courierId: input.courierId,
      deliveryId: activeDeliveryId,
      stored: true,
      anomalies: anomalies.length ? anomalies : undefined
    };
  }

  private async resolveActiveDeliveryId(courierId: string): Promise<string | undefined> {
    const deliveries = await this.deliveryRepository.findByCourierId(courierId);
    const active = deliveries.find(delivery =>
      ['assigned', 'picked_up', 'in_transit'].includes(delivery.status)
    );
    return active?.id;
  }

  private async publishEvent(eventType: string, eventData: Record<string, unknown>): Promise<void> {
    if (!this.eventPublisher) return;

    await this.eventPublisher.publish({
      eventId: makeId(getModelPrefix('Logistics_OutboxEvent')),
      eventType,
      aggregateId: String(eventData.deliveryId || eventData.courierId || ''),
      aggregateType: eventData.deliveryId ? 'Logistics_Delivery' : 'Logistics_Courier',
      eventData,
      timestamp: new Date()
    });
  }
}
