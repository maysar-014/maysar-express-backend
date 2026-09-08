/**
 * EvaluateRouteInsertionsUseCase (Phase 5 §5.2)
 *
 * When a new Shipment enters the pool and active DeliveryJobs exist in the
 * same area, evaluate inserting it into each compatible active job's route:
 *   marginalCost = cost(route_with_new_stop) − cost(current_route)
 * If marginalCost < insertionCostThresholdTzs (from the active, versioned
 * OptimizationConfig) and vehicle capacity permits, the job is flagged as an
 * insertion candidate. Every evaluation is persisted to
 * Logistics_RouteInsertionCandidate for retrospective analysis of
 * optimization quality (backlog §5.2).
 */

import { RouteInsertionEngine, InsertionShipment, InsertionVehicle, InsertionTariff, InsertionEvaluation } from '../../domain/engines/route-insertion.engine';
import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { DeliveryJobRepository } from '../../domain/repositories/delivery-job.repository';
import { VehicleTariffRepository } from '../../domain/repositories/vehicle-tariff.repository';
import { RouteInsertionCandidateRepository } from '../../domain/repositories/phase5.repository';
import { RouteInsertionCandidate } from '../../domain/entities/route-insertion-candidate.entity';
import { makeId } from '../../../../../shared/ids/id';

/** Default when no active OptimizationConfig exists (kept conservative). */
const DEFAULT_INSERTION_COST_THRESHOLD_TZS = 5_000;

export class EvaluateRouteInsertionsUseCase {
  private readonly engine = new RouteInsertionEngine();

  constructor(
    private readonly shipmentRepo: ShipmentRepository,
    private readonly jobRepo: DeliveryJobRepository,
    private readonly tariffRepo: VehicleTariffRepository,
    private readonly candidateRepo: RouteInsertionCandidateRepository,
    private readonly getInsertionThresholdTzs: () => Promise<number> = async () => DEFAULT_INSERTION_COST_THRESHOLD_TZS,
  ) {}

  async execute(shipmentId: string): Promise<InsertionEvaluation[]> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    const tariff = await this.tariffRepo.findLatestActive();
    const insertionTariff: InsertionTariff = {
      costPerKmTzs: tariff?.costPerKmTzs ?? 500,
      costPerHourTzs: tariff?.costPerHourTzs ?? 12_000,
      loadingFeeTzs: tariff?.loadingFeeTzs ?? 0,
      unloadingFeeTzs: tariff?.unloadingFeeTzs ?? 0,
    };
    const thresholdTzs = await this.getInsertionThresholdTzs();

    const activeJobs = await this.jobRepo.findActive();
    const insertShipment: InsertionShipment = {
      shipmentId: shipment.id,
      pickup: { lat: shipment.origin.getLatitude(), lng: shipment.origin.getLongitude() },
      drop: { lat: shipment.destination.getLatitude(), lng: shipment.destination.getLongitude() },
      weightKg: shipment.packageWeightKg,
      requiredVehicleClass: shipment.requiredVehicleClass ?? null,
    };

    const evaluations: InsertionEvaluation[] = [];
    for (const job of activeJobs) {
      const jobShipmentIds = job.shipmentIds;
      const jobShipments = (await Promise.all(jobShipmentIds.map(id => this.shipmentRepo.findById(id))))
        .filter((s): s is NonNullable<typeof s> => s !== null);
      if (jobShipments.length === 0) continue;

      const committedWeightKg = jobShipments.reduce((s, x) => s + x.packageWeightKg, 0);
      const vehicle: InsertionVehicle = {
        // Vehicle type is unknown until a driver/vehicle is assigned; when the
        // job has no vehicle yet the class check can only pass for untagged
        // shipments — use the required class if present, else 'MOTORCYCLE'.
        vehicleType: insertShipment.requiredVehicleClass ?? 'MOTORCYCLE',
        maxWeightKg: Number.MAX_SAFE_INTEGER, // capacity gate refined at dispatch
        committedWeightKg,
      };

      // Current route: pickups then buyer drop of the last shipment.
      const currentRoute = [
        ...jobShipments.map(s => ({ lat: s.origin.getLatitude(), lng: s.origin.getLongitude() })),
        { lat: jobShipments[jobShipments.length - 1].destination.getLatitude(), lng: jobShipments[jobShipments.length - 1].destination.getLongitude() },
      ];

      const evaluation = this.engine.evaluate({
        currentRoute,
        shipment: insertShipment,
        vehicle,
        tariff: insertionTariff,
        insertionCostThresholdTzs: thresholdTzs,
      });

      await this.candidateRepo.save(
        RouteInsertionCandidate.create({
          id: makeId('ric'),
          shipmentId: shipment.id,
          deliveryJobId: job.id,
          marginalCostTzs: evaluation.marginalCostTzs,
          additionalDistanceKm: evaluation.additionalDistanceKm,
          additionalDurationMinutes: evaluation.additionalDurationMinutes,
          feasible: evaluation.feasible,
          rejectionReason: evaluation.rejectionReason ?? (evaluation.feasible ? null : 'THRESHOLD'),
        }),
      );
      evaluations.push(evaluation);
    }

    return evaluations;
  }
}
