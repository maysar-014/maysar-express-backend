/**
 * ShipmentPoolService + PoolOptimizationJob (Phase 5 §5.3)
 *
 * Pool maintenance:
 *   - `refresh(shipment)`  upserts the Logistics_ShipmentPoolEntry mirror
 *     (called on every Shipment state change — creation and assignment)
 *   - `remove(shipmentId)` drops the entry when the shipment leaves the pool
 *     (assigned to a DeliveryJob or terminal)
 *
 * Optimization job:
 *   - scheduled scan (configurable interval, default 5 min) over PENDING pool
 *     entries
 *   - clusters entries via the pure `clusterPoolEntries` helper
 *     (consolidationRadiusKm from the active PricingConfig)
 *   - clusters of ≥ 2 shipments that meet weight thresholds generate a
 *     candidate PENDING DeliveryJob
 *   - optionally presents each candidate job to the matching engine
 *     (MatchDriversUseCase) — non-fatal if unavailable
 *   - per-run analytics: shipments evaluated, clusters found, jobs created,
 *     average estimated savings per consolidated job (fairness-KPI feed,
 *     Phase 6)
 */

import { PoolEntryLike, ClusterConstraints, clusterPoolEntries, haversineKm } from '../../domain/engines/pool-clustering';
import { makeId } from '../../../../../shared/ids/id';

export interface PoolRunStats {
  ranAt: string;
  shipmentsEvaluated: number;
  clustersFound: number;
  consolidationCandidates: number;
  jobsCreated: number;
  averageSavingsPerConsolidatedJobTzs: number;
  driverMatchesFound: number;
}

const DEFAULT_RADIUS_KM = 5.0;
const DEFAULT_MAX_GROUP_WEIGHT_KG = 20.0;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export class ShipmentPoolService {
  private readonly prisma = () => (globalThis as any).prisma;

  async refresh(shipment: {
    id: string;
    status: string;
    origin: { getLatitude(): number; getLongitude(): number };
    destination: { getLatitude(): number; getLongitude(): number };
    packageWeightKg: number;
    requiredVehicleClass: string | null;
    requestedDeliveryWindow: { earliestAt: Date; latestAt: Date } | null;
    deliveryJobId: string | null;
  }): Promise<void> {
    const db = this.prisma();
    if (!db?.logistics_ShipmentPoolEntry) return;

    // Assigned or terminal shipments are not pool candidates.
    if (shipment.deliveryJobId || shipment.status === 'DELIVERED' || shipment.status === 'FAILED') {
      await this.remove(shipment.id);
      return;
    }

    const data = {
      status: shipment.status,
      originLat: shipment.origin.getLatitude(),
      originLng: shipment.origin.getLongitude(),
      destinationLat: shipment.destination.getLatitude(),
      destinationLng: shipment.destination.getLongitude(),
      packageWeightKg: shipment.packageWeightKg,
      requiredVehicleClass: shipment.requiredVehicleClass,
      windowEarliestAt: shipment.requestedDeliveryWindow?.earliestAt ?? null,
      windowLatestAt: shipment.requestedDeliveryWindow?.latestAt ?? null,
      refreshedAt: new Date(),
    };

    try {
      await db.logistics_ShipmentPoolEntry.upsert({
        where: { shipmentId: shipment.id },
        update: data,
        create: { id: makeId('spl'), shipmentId: shipment.id, ...data },
      });
    } catch (err: any) {
      // Pool maintenance is non-fatal — the shipments table is the source of truth.
      console.error('[ShipmentPoolService] refresh failed (non-fatal):', err?.message);
    }
  }

  async remove(shipmentId: string): Promise<void> {
    try {
      await this.prisma()?.logistics_ShipmentPoolEntry?.deleteMany?.({ where: { shipmentId } });
    } catch (err: any) {
      console.error('[ShipmentPoolService] remove failed (non-fatal):', err?.message);
    }
  }
}

export interface PoolOptimizationDeps {
  /** Loads the active PricingConfig's consolidation constraints. */
  loadConstraints?: () => Promise<ClusterConstraints | null>;
  /** Optional driver matching for candidate jobs (non-fatal). */
  matchDrivers?: (jobId: string) => Promise<{ offerable: boolean; matches: unknown[] }>;
  /** Individual-quotes baseline per shipment for savings estimation. */
  estimateIndividualCostTzs?: (entry: PoolEntryLike) => Promise<number>;
}

const EMPTY_STATS = (): PoolRunStats => ({
  ranAt: new Date().toISOString(),
  shipmentsEvaluated: 0,
  clustersFound: 0,
  consolidationCandidates: 0,
  jobsCreated: 0,
  averageSavingsPerConsolidatedJobTzs: 0,
  driverMatchesFound: 0,
});

export class PoolOptimizationJob {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly intervalMs: number = DEFAULT_INTERVAL_MS,
    private readonly deps: PoolOptimizationDeps = {},
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.run().catch(() => {});
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Skip-safe wrapper: a run never overlaps a still-running previous one. */
  async run(): Promise<PoolRunStats> {
    if (this.running) return EMPTY_STATS();
    this.running = true;
    try {
      return await this.runOnce();
    } finally {
      this.running = false;
    }
  }

  private async runOnce(): Promise<PoolRunStats> {
    const startedAt = Date.now();
    const db = (globalThis as any).prisma;
    const stats = EMPTY_STATS();
    if (!db?.logistics_ShipmentPoolEntry?.findMany) return stats;

    const rows: any[] = await db.logistics_ShipmentPoolEntry.findMany({
      where: { status: { in: ['CREATED', 'PLANNED'] } },
    });
    const entries: PoolEntryLike[] = rows.map((r: any) => ({
      shipmentId: r.shipmentId,
      status: r.status,
      originLat: r.originLat,
      originLng: r.originLng,
      destinationLat: r.destinationLat,
      destinationLng: r.destinationLng,
      packageWeightKg: r.packageWeightKg,
      requiredVehicleClass: r.requiredVehicleClass ?? null,
      windowEarliestAt: r.windowEarliestAt ? new Date(r.windowEarliestAt) : null,
      windowLatestAt: r.windowLatestAt ? new Date(r.windowLatestAt) : null,
    }));
    stats.shipmentsEvaluated = entries.length;

    const constraints =
      (await this.deps.loadConstraints?.()) ?? {
        consolidationRadiusKm: DEFAULT_RADIUS_KM,
        maxGroupWeightKg: DEFAULT_MAX_GROUP_WEIGHT_KG,
      };

    const clusters = clusterPoolEntries(entries, constraints);
    stats.clustersFound = clusters.length;
    const savingsPerJob: number[] = [];

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      stats.consolidationCandidates += 1;
      const estimatedSavings = await this.estimateClusterSavings(cluster);

      try {
        const { DeliveryJob } = await import('../../domain/entities/delivery-job.entity');
        const job = DeliveryJob.create({
          shipmentIds: cluster.map(e => e.shipmentId),
          scheduledPickupAt: earliestWindow(cluster),
        });
        await db.logistics_DeliveryJob?.create?.({
          data: {
            id: job.id,
            shipmentIds: job.shipmentIds,
            status: job.status,
            scheduledPickupAt: job.scheduledPickupAt,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        stats.jobsCreated += 1;
        if (estimatedSavings > 0) savingsPerJob.push(estimatedSavings);

        if (this.deps.matchDrivers) {
          try {
            const match = await this.deps.matchDrivers(job.id);
            stats.driverMatchesFound += match.matches?.length ?? 0;
          } catch (err: any) {
            console.error('[PoolOptimizationJob] matchDrivers failed (non-fatal):', err?.message);
          }
        }
      } catch (err: any) {
        console.error('[PoolOptimizationJob] candidate job creation failed (non-fatal):', err?.message);
      }
    }

    stats.averageSavingsPerConsolidatedJobTzs =
      savingsPerJob.length > 0
        ? Math.round(savingsPerJob.reduce((a, b) => a + b, 0) / savingsPerJob.length)
        : 0;

    // Persist per-run analytics (fairness-KPI feed, Phase 6). Non-fatal.
    try {
      await db.logistics_PoolOptimizationRun?.create?.({
        data: {
          id: makeId('por'),
          shipmentsEvaluated: stats.shipmentsEvaluated,
          consolidationCandidatesFound: stats.consolidationCandidates,
          jobsCreated: stats.jobsCreated,
          averageSavingsPerJobTzs: stats.averageSavingsPerConsolidatedJobTzs,
          durationMs: Date.now() - startedAt,
        },
      });
    } catch (err: any) {
      console.error('[PoolOptimizationJob] analytics persistence failed (non-fatal):', err?.message);
    }

    console.info(
      `[PoolOptimizationJob] run: evaluated=${stats.shipmentsEvaluated} clusters=${stats.clustersFound} candidates=${stats.consolidationCandidates} jobs=${stats.jobsCreated} avgSavings=${stats.averageSavingsPerConsolidatedJobTzs} driverMatches=${stats.driverMatchesFound}`,
    );
    return stats;
  }

  /**
   * Estimated saving of consolidating a cluster vs individual single-shipment
   * runs ( SYNC-WITH: VehicleTariff — placeholder rates until the three-engine
   * path is wired to pool jobs; uses the fallback tariff constants).
   */
  private async estimateClusterSavings(cluster: PoolEntryLike[]): Promise<number> {
    let individualTotal = 0;
    if (this.deps.estimateIndividualCostTzs) {
      for (const entry of cluster) {
        individualTotal += await this.deps.estimateIndividualCostTzs(entry);
      }
    } else {
      const anchor = cluster[0];
      const spreadKm = cluster.reduce(
        (max, e) =>
          Math.max(max, haversineKm(anchor.originLat, anchor.originLng, e.originLat, e.originLng)),
        0,
      );
      individualTotal = cluster.length * (2000 + 500 * spreadKm * 1.35);
    }

    const chainKm = cluster.reduce((sum, e, i) => {
      if (i === 0) return sum;
      const prev = cluster[i - 1];
      return sum + haversineKm(prev.originLat, prev.originLng, e.originLat, e.originLng);
    }, 0);
    const maxFar = Math.max(
      ...cluster.map(e =>
        haversineKm(e.originLat, e.originLng, e.destinationLat, e.destinationLng),
      ),
    );
    const consolidatedCost = (2000 + 500 * (chainKm + maxFar) * 1.35) * cluster.length;

    return Math.max(0, individualTotal - consolidatedCost);
  }
}

function earliestWindow(cluster: PoolEntryLike[]): Date | null {
  const dates = cluster
    .map(e => e.windowEarliestAt)
    .filter((d): d is Date => d instanceof Date);
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map(d => d.getTime())));
}

