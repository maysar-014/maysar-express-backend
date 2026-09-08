/**
 * Prisma implementations for the Phase 5 repositories (append-only audit
 * tables) plus the DriverCandidateProvider over Logistics_Courier.
 */

import { RouteInsertionCandidate, RouteInsertionCandidateData } from '../../domain/entities/route-insertion-candidate.entity';
import { DriverMatchAudit, DriverMatchAuditData } from '../../domain/entities/driver-match-audit.entity';
import {
  RouteInsertionCandidateRepository,
  DriverMatchAuditRepository,
} from '../../domain/repositories/phase5.repository';
import { DriverCandidate } from '../../domain/engines/driver-matching.engine';

// ─── RouteInsertionCandidate (append-only) ───────────────────────────────────

export class PrismaRouteInsertionCandidateRepository implements RouteInsertionCandidateRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(candidate: RouteInsertionCandidate): Promise<void> {
    const data = candidate.toJSON();
    await this.prisma?.logistics_RouteInsertionCandidate?.create?.({
      data: {
        id: data.id,
        shipmentId: data.shipmentId,
        deliveryJobId: data.deliveryJobId,
        marginalCostTzs: data.marginalCostTzs,
        additionalDistanceKm: data.additionalDistanceKm,
        additionalDurationMinutes: data.additionalDurationMinutes,
        feasible: data.feasible,
        rejectionReason: data.rejectionReason,
        evaluatedAt: data.evaluatedAt,
      },
    });
  }

  async findByShipmentId(shipmentId: string): Promise<RouteInsertionCandidate[]> {
    const rows = await this.prisma?.logistics_RouteInsertionCandidate?.findMany?.({
      where: { shipmentId },
      orderBy: { evaluatedAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => RouteInsertionCandidate.fromPersisted(this.toData(r)));
  }

  async findByDeliveryJobId(deliveryJobId: string): Promise<RouteInsertionCandidate[]> {
    const rows = await this.prisma?.logistics_RouteInsertionCandidate?.findMany?.({
      where: { deliveryJobId },
      orderBy: { evaluatedAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => RouteInsertionCandidate.fromPersisted(this.toData(r)));
  }

  async findFeasible(shipmentId: string): Promise<RouteInsertionCandidate[]> {
    const rows = await this.prisma?.logistics_RouteInsertionCandidate?.findMany?.({
      where: { shipmentId, feasible: true },
      orderBy: { marginalCostTzs: 'asc' },
    });
    return (rows ?? []).map((r: any) => RouteInsertionCandidate.fromPersisted(this.toData(r)));
  }

  private toData(r: any): RouteInsertionCandidateData {
    return {
      id: r.id,
      shipmentId: r.shipmentId,
      deliveryJobId: r.deliveryJobId,
      marginalCostTzs: Number(r.marginalCostTzs),
      additionalDistanceKm: Number(r.additionalDistanceKm),
      additionalDurationMinutes: r.additionalDurationMinutes,
      feasible: r.feasible,
      rejectionReason: r.rejectionReason ?? null,
      evaluatedAt: r.evaluatedAt,
    };
  }
}

// ─── DriverMatchAudit (append-only) ──────────────────────────────────────────

export class PrismaDriverMatchAuditRepository implements DriverMatchAuditRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(audit: DriverMatchAudit): Promise<void> {
    const data = audit.toJSON();
    await this.prisma?.logistics_DriverMatchAudit?.create?.({
      data: {
        id: data.id,
        deliveryJobId: data.deliveryJobId,
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        vehicleType: data.vehicleType,
        score: data.score,
        eligible: data.eligible,
        exclusionReason: data.exclusionReason,
        scoreComponents: data.scoreComponents,
        estimatedCompensationTzs: data.estimatedCompensationTzs,
        etaMinutes: data.etaMinutes,
        distanceToPickupKm: data.distanceToPickupKm,
        matchedAt: data.matchedAt,
      },
    });
  }

  async findByDeliveryJobId(deliveryJobId: string): Promise<DriverMatchAudit[]> {
    const rows = await this.prisma?.logistics_DriverMatchAudit?.findMany?.({
      where: { deliveryJobId },
      orderBy: { matchedAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => DriverMatchAudit.fromPersisted(this.toData(r)));
  }

  async findByDriverId(driverId: string): Promise<DriverMatchAudit[]> {
    const rows = await this.prisma?.logistics_DriverMatchAudit?.findMany?.({
      where: { driverId },
      orderBy: { matchedAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => DriverMatchAudit.fromPersisted(this.toData(r)));
  }

  private toData(r: any): DriverMatchAuditData {
    return {
      id: r.id,
      deliveryJobId: r.deliveryJobId,
      driverId: r.driverId,
      vehicleId: r.vehicleId ?? null,
      vehicleType: r.vehicleType,
      score: Number(r.score),
      eligible: r.eligible,
      exclusionReason: r.exclusionReason ?? null,
      scoreComponents: r.scoreComponents,
      estimatedCompensationTzs: Number(r.estimatedCompensationTzs),
      etaMinutes: r.etaMinutes,
      distanceToPickupKm: Number(r.distanceToPickupKm),
      matchedAt: r.matchedAt,
    };
  }
}

// ─── DriverCandidateProvider (over Logistics_Courier) ────────────────────────

/**
 * Reads available couriers and shapes them into DriverMatchEngine candidates.
 * Available = courier status 'online' with a known current location.
 * Proximity to the pickup point (within 15 km straight-line) gates availability.
 */
export class PrismaDriverCandidateProvider {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async findCandidatesNear(pickup: { lat: number; lng: number; area: string }): Promise<DriverCandidate[]> {
    const couriers = await this.prisma?.logistics_Courier?.findMany?.({
      where: { status: 'online' },
    });
    if (!Array.isArray(couriers)) return [];

    return couriers
      .filter((c: any) => c.currentLatitude != null && c.currentLongitude != null)
      .map((c: any) => {
        const distanceToPickupKm = this.haversineKm(
          c.currentLatitude,
          c.currentLongitude,
          pickup.lat,
          pickup.lng,
        );
        return {
          driverId: c.id,
          vehicleId: null, // Logistics_Courier carries vehicle fields inline
          vehicleType: c.vehicleType,
          maxWeightKg: c.vehicleCapacity ?? 0,
          committedWeightKg: 0, // the job's own weight is added by the use case
          distanceToPickupKm: Math.round(distanceToPickupKm * 100) / 100,
          etaMinutes: Math.ceil((distanceToPickupKm * 1.35 / 30) * 60),
          reliabilityScore: Math.min(1, Math.max(0, c.onTimeDeliveryRate ?? 0)),
          routeCompatibility: 0.5, // neutral default — no live route data yet
          estimatedCompensationTzs: 0, // set by the use case from tariff + route
          servesAreas: ['Dar es Salaam'],
          jobArea: pickup.area,
          isAvailable: distanceToPickupKm <= 15,
        } satisfies DriverCandidate;
      });
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
}
