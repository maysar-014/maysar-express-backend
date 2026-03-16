import { GeoPoint } from '../value-objects/geopoint.value-object';
import type { DeliveryForRoute } from '../services/route-creation.service';

export interface PickupCluster {
  centroid: GeoPoint;
  deliveries: DeliveryForRoute[];
}

export interface PickupClusteringConfig {
  radiusKm: number;
  maxClusterSize?: number;
}

/**
 * Pickup Clustering Algorithm
 *
 * Groups deliveries by pickup proximity using a fast geodesic distance check.
 * Keeps clustering deterministic and cheap for small fleets.
 */
export class PickupClusteringAlgorithm {
  static clusterByPickup(
    deliveries: DeliveryForRoute[],
    config: PickupClusteringConfig
  ): PickupCluster[] {
    if (!deliveries.length) return [];

    const radiusKm = Math.max(0.1, config.radiusKm);
    const maxClusterSize = config.maxClusterSize && config.maxClusterSize > 0
      ? config.maxClusterSize
      : undefined;

    const remaining = [...deliveries];
    const clusters: PickupCluster[] = [];

    while (remaining.length) {
      const seed = remaining.shift()!;
      const clusterDeliveries: DeliveryForRoute[] = [seed];

      for (let i = remaining.length - 1; i >= 0; i -= 1) {
        if (maxClusterSize && clusterDeliveries.length >= maxClusterSize) {
          break;
        }

        const candidate = remaining[i];
        const distance = seed.pickupLocation.distanceTo(candidate.pickupLocation);
        if (distance <= radiusKm) {
          clusterDeliveries.push(candidate);
          remaining.splice(i, 1);
        }
      }

      clusters.push({
        centroid: this.calculateCentroid(clusterDeliveries),
        deliveries: clusterDeliveries
      });
    }

    return clusters;
  }

  private static calculateCentroid(deliveries: DeliveryForRoute[]): GeoPoint {
    if (deliveries.length === 1) return deliveries[0].pickupLocation;

    const sums = deliveries.reduce(
      (acc, delivery) => {
        const coords = delivery.pickupLocation.getCoordinates();
        acc.lat += coords.lat;
        acc.lng += coords.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    const avgLat = sums.lat / deliveries.length;
    const avgLng = sums.lng / deliveries.length;
    return GeoPoint.create(avgLat, avgLng, 'Pickup Cluster Centroid');
  }
}
