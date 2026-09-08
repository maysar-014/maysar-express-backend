/**
 * MatchDriversUseCase (Phase 5 §5.1)
 *
 * Ranks available drivers for a DeliveryJob:
 *   1. Load the job + its shipments (weight, required vehicle class, route)
 *   2. Load the active VehicleTariff (minimum earnings + cost rates)
 *   3. Fetch candidate drivers near the pickup
 *   4. Run the pure DriverMatchingEngine (hard filters first, best-score not
 *      cheapest — backlog rule 8 and §5.1)
 *   5. Persist every candidate result as a DriverMatchAudit row (append-only)
 *
 * Minimum-earnings gate (backlog rule 3): candidates whose estimated
 * compensation falls below vehicle.minimumJobCompensationTzs are excluded by
 * the engine AND flagged in the use-case response — a job with no eligible
 * candidate is not offerable and must be repriced/merged/escalated.
 */

import { DriverMatchingEngine, DriverMatchResult, JobMatchContext } from '../../domain/engines/driver-matching.engine';
import { DeliveryJobRepository } from '../../domain/repositories/delivery-job.repository';
import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { VehicleTariffRepository } from '../../domain/repositories/vehicle-tariff.repository';
import { DriverMatchAuditRepository } from '../../domain/repositories/phase5.repository';
import { DriverMatchAudit } from '../../domain/entities/driver-match-audit.entity';
import { makeId } from '../../../../../shared/ids/id';

export interface DriverCandidateSource {
  findCandidatesNear(pickup: { lat: number; lng: number; area: string }): Promise<
    Array<{
      driverId: string;
      vehicleId: string | null;
      vehicleType: string;
      maxWeightKg: number;
      committedWeightKg: number;
      distanceToPickupKm: number;
      etaMinutes: number;
      reliabilityScore: number;
      routeCompatibility: number;
      estimatedCompensationTzs: number;
      servesAreas: string[];
      jobArea: string;
      isAvailable: boolean;
    }>
  >;
}

export interface MatchDriversResult {
  deliveryJobId: string;
  /** True when at least one candidate meets every hard constraint. */
  offerable: boolean;
  gate: {
    minimumJobCompensationTzs: number;
    estimatedCompensationTzs: number;
    meetsMinimumEarnings: boolean;
  };
  matches: DriverMatchResult[];
  excludedCount: number;
}

export class MatchDriversUseCase {
  private readonly engine = new DriverMatchingEngine();

  constructor(
    private readonly jobRepo: DeliveryJobRepository,
    private readonly shipmentRepo: ShipmentRepository,
    private readonly tariffRepo: VehicleTariffRepository,
    private readonly candidateSource: DriverCandidateSource,
    private readonly auditRepo: DriverMatchAuditRepository,
  ) {}

  async execute(jobId: string): Promise<MatchDriversResult> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error(`DeliveryJob ${jobId} not found`);

    const shipments = await Promise.all(job.shipmentIds.map(id => this.shipmentRepo.findById(id)));
    const valid = shipments.filter((s): s is NonNullable<typeof s> => s !== null);

    const jobWeightKg = valid.reduce((sum, s) => sum + s.packageWeightKg, 0);
    const requiredVehicleClass =
      valid.find(s => s.requiredVehicleClass)?.requiredVehicleClass ?? null;

    const tariff = await this.tariffRepo.findLatestActive();

    // Estimated job route: first shipment origin → last shipment destination
    // (straight-line × 1.35 road factor — consistent with codebase fallback).
    const estimatedRouteKm =
      valid.length >= 1
        ? this.haversineKm(
            valid[0].origin.getLatitude(),
            valid[0].origin.getLongitude(),
            valid[valid.length - 1].destination.getLatitude(),
            valid[valid.length - 1].destination.getLongitude(),
          ) * 1.35
        : 0;
    const estimatedRouteMinutes = (estimatedRouteKm / 30) * 60;

    const minimumJobCompensationTzs = tariff?.minimumJobCompensationTzs ?? 0;
    const estimatedCompensationTzs = tariff
      ? Math.max(
          minimumJobCompensationTzs,
          Math.round(
            tariff.costPerKmTzs * estimatedRouteKm +
              (tariff.costPerHourTzs / 60) * estimatedRouteMinutes +
              tariff.loadingFeeTzs +
              tariff.unloadingFeeTzs,
          ),
        )
      : minimumJobCompensationTzs;

    const context: JobMatchContext = {
      jobWeightKg,
      requiredVehicleClass,
      minimumJobCompensationTzs,
      compensationPerKmTzs: tariff?.costPerKmTzs ?? 0,
    };

    // Pickup = first shipment's origin.
    const pickup =
      valid.length >= 1
        ? { lat: valid[0].origin.getLatitude(), lng: valid[0].origin.getLongitude(), area: valid[0].origin.getAddress() }
        : { lat: 0, lng: 0, area: 'unknown' };

    const candidates = (await this.candidateSource.findCandidatesNear(pickup)).map(c => ({
      ...c,
      estimatedCompensationTzs,
    }));

    const ranked = this.engine.rank(candidates, context);
    const eligible = ranked.filter(r => r.eligible);

    // Audit every candidate result — append-only, so any assignment can be
    // explained after the fact (backlog §5.1 audit requirement).
    await Promise.all(
      ranked.map(r =>
        this.auditRepo.save(
          DriverMatchAudit.create({
            id: makeId('dma'),
            deliveryJobId: jobId,
            driverId: r.driverId,
            vehicleId: r.vehicleId,
            vehicleType: r.vehicleType,
            score: r.score,
            eligible: r.eligible,
            exclusionReason: r.exclusionReason,
            scoreComponents: r.scoreComponents,
            estimatedCompensationTzs: r.estimatedCompensationTzs,
            etaMinutes: r.etaMinutes,
            distanceToPickupKm: r.distanceToPickupKm,
          }),
        ),
      ),
    );

    return {
      deliveryJobId: jobId,
      offerable: eligible.length > 0,
      gate: {
        minimumJobCompensationTzs,
        estimatedCompensationTzs,
        meetsMinimumEarnings: estimatedCompensationTzs >= minimumJobCompensationTzs,
      },
      matches: ranked,
      excludedCount: ranked.length - eligible.length,
    };
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
