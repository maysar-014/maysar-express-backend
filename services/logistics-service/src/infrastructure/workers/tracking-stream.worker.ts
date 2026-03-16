import { IDeliveryRepository, ITrackingRepository } from '../../domain/repositories';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';
import { EventPublisherPort } from '../../domain/engines/ports/event-publisher.port';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface TrackingStreamWorkerOptions {
  intervalMs?: number;
  maxStalenessMinutes?: number;
}

export class TrackingStreamWorker {
  private intervalHandle?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly deliveryRepository: IDeliveryRepository,
    private readonly trackingRepository: ITrackingRepository,
    private readonly eventPublisher: EventPublisherPort | null
  ) {}

  start(options: TrackingStreamWorkerOptions = {}): void {
    if (this.intervalHandle) {
      return;
    }

    const intervalMs = options.intervalMs
      ?? Number(process.env.LOGISTICS_ETA_REFRESH_INTERVAL_MS ?? '60000');

    const resolvedInterval = Number.isFinite(intervalMs) && intervalMs > 5000 ? intervalMs : 60000;

    this.intervalHandle = setInterval(() => {
      void this.tick(options);
    }, resolvedInterval);

    void this.tick(options);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  private async tick(options: TrackingStreamWorkerOptions): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const activeDeliveries = await this.deliveryRepository.findActiveDeliveries();
      if (!activeDeliveries.length) {
        return;
      }

      const maxStalenessMinutes = options.maxStalenessMinutes
        ?? Number(process.env.LOGISTICS_ETA_MAX_STALENESS_MINUTES ?? '30');
      const stalenessMs = (Number.isFinite(maxStalenessMinutes) ? maxStalenessMinutes : 30) * 60 * 1000;

      for (const delivery of activeDeliveries) {
        const latest = await this.trackingRepository.getLatestTracking(delivery.id);
        if (!latest) continue;

        const ageMs = Date.now() - latest.timestamp.getTime();
        if (ageMs > stalenessMs) {
          continue;
        }

        const distanceResult = await DistanceCalculationAlgorithm.calculateDeliveryDistance(
          latest.location,
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

        await this.publishEvent('Logistics.Delivery.EtaRefreshed.v1', {
          deliveryId: delivery.id,
          courierId: delivery.courierId,
          estimatedArrival,
          etaMinutes,
          distanceKm: distanceResult.distance,
          refreshedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Tracking stream worker failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async publishEvent(eventType: string, eventData: Record<string, unknown>): Promise<void> {
    if (!this.eventPublisher) return;

    await this.eventPublisher.publish({
      eventId: makeId(getModelPrefix('Logistics_OutboxEvent')),
      eventType,
      aggregateId: String(eventData.deliveryId || ''),
      aggregateType: 'Logistics_Delivery',
      eventData,
      timestamp: new Date()
    });
  }
}
