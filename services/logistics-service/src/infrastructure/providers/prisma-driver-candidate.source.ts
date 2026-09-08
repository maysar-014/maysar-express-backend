/**
 * PrismaDriverCandidateSource (Phase 5 §5.1)
 *
 * Reads real courier availability from Logistics_Courier: online couriers
 * with known locations, ranked-distance candidates near a pickup point.
 * Reliability = onTimeDeliveryRate (0..1). ETA assumes 30 km/h urban average
 * (codebase fallback convention).
 */

import { DriverCandidateSource } from '../../application/use-cases/match-drivers.use-case';

const EARTH_RADIUS_KM = 6371;
const MAX_CANDIDATE_RADIUS_KM = 25;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export class PrismaDriverCandidateSource implements DriverCandidateSource {
  async findCandidatesNear(pickup: { lat: number; lng: number; area: string }) {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.logistics_Courier) return [];

    const couriers = await prisma.logistics_Courier.findMany({
      where: { status: 'online' },
      take: 100,
    });

    return couriers
      .filter(
        (c: any) =>
          c.currentLatitude != null &&
          c.currentLongitude != null &&
          c.vehicleCapacity > 0,
      )
      .map((c: any) => {
        const distanceToPickupKm = haversineKm(
          pickup.lat,
          pickup.lng,
          c.currentLatitude,
          c.currentLongitude,
        );
        return {
          driverId: c.id,
          vehicleId: c.id, // Logistics_Courier embeds the vehicle in the driver row
          vehicleType: String(c.vehicleType).toUpperCase(),
          maxWeightKg: c.vehicleCapacity as number,
          committedWeightKg: 0,
          distanceToPickupKm,
          etaMinutes: Math.ceil((distanceToPickupKm / 30) * 60),
          reliabilityScore:
            c.onTimeDeliveryRate > 1 ? c.onTimeDeliveryRate / 100 : c.onTimeDeliveryRate,
          routeCompatibility: 1, // no active-route model yet — neutral
          estimatedCompensationTzs: 0, // set by MatchDriversUseCase from the tariff
          servesAreas: [] as string[],
          jobArea: pickup.area,
          isAvailable: distanceToPickupKm <= MAX_CANDIDATE_RADIUS_KM,
        };
      });
  }
}
