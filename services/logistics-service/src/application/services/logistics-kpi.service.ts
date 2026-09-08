/**
 * LogisticsKpiService (Phase 6 §6.2)
 *
 * Computes the fairness and operational KPIs from existing records:
 *
 *   Buyer KPI         actual fulfillment cost / buyer price — rolling 7-day
 *                     average from Logistics_PricingAuditRecord
 *                     (cost = buyerDeliveryFee − platformMarginAmount).
 *                     Alert when above config.maxBuyerPriceRatio.
 *   Driver KPI        estimated earnings per active hour per driver from
 *                     Logistics_DriverMatchAudit. Alert when below
 *                     config.minimumDriverHourlyRateTzs.
 *   Vehicle KPI       used capacity / max capacity per assigned job vs
 *                     maxWeightKg. Alert when below
 *                     config.minVehicleUtilizationTarget.
 *   Route KPI         revenue_per_km and revenue_per_hour — 7-day averages
 *                     from Logistics_PricingAuditRecord.
 *   Consolidation KPI total savings from Logistics_ConsolidationAudit —
 *                     the headline metric for the optimization engine.
 *
 * Read-only analytics: every query is non-fatal and degrades to null when a
 * source table is unavailable.
 */

import { PrismaOptimizationConfigRepository } from '../../infrastructure/repositories/prisma-optimization-config.repository';
import { OptimizationConfig } from '../../domain/value-objects/optimization-config.value-object';

export interface LogisticsKpis {
  ranAt: string;
  buyer: {
    averageCostToPriceRatio: number | null;
    threshold: number;
    alert: boolean;
    sampleSize: number;
  } | null;
  driver: {
    driversBelowMinimumHourly: number;
    driversEvaluated: number;
    minimumHourlyRateTzs: number;
    alert: boolean;
  } | null;
  vehicle: {
    averageUtilization: number | null;
    threshold: number;
    alert: boolean;
    jobsEvaluated: number;
  } | null;
  route: {
    averageRevenuePerKmTzs: number | null;
    averageRevenuePerHourTzs: number | null;
    sampleSize: number;
  } | null;
  consolidation: {
    totalSavingsTzs: number;
    auditsCounted: number;
  } | null;
}

export class LogisticsKpiService {
  private readonly configRepo: PrismaOptimizationConfigRepository;

  constructor(configRepo?: PrismaOptimizationConfigRepository) {
    this.configRepo = configRepo ?? new PrismaOptimizationConfigRepository();
  }

  async compute(): Promise<LogisticsKpis> {
    const db = (globalThis as any).prisma;
    const ranAt = new Date().toISOString();
    const config = await this.loadConfig();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return {
      ranAt,
      buyer: await this.buyerKpi(db, config, since7d),
      driver: await this.driverKpi(db, config),
      vehicle: await this.vehicleKpi(db, config),
      route: await this.routeKpi(db, since7d),
      consolidation: await this.consolidationKpi(db),
    };
  }

  private async loadConfig(): Promise<OptimizationConfig> {
    try {
      return (await this.configRepo.findActive())
        ?? OptimizationConfig.create({ weights: OptimizationConfig.defaultWeights() });
    } catch {
      return OptimizationConfig.create({ weights: OptimizationConfig.defaultWeights() });
    }
  }

  /** Buyer KPI: rolling 7-day cost/price ratio from pricing audit records. */
  private async buyerKpi(db: any, config: OptimizationConfig, since: Date) {
    try {
      const rows = await db.logistics_PricingAuditRecord?.findMany?.({
        where: { recordedAt: { gte: since } },
        select: { buyerDeliveryFee: true, platformMarginAmount: true },
        take: 5000,
      });
      if (!rows?.length) return null;
      const ratios = rows
        .map((r: any) => {
          const fee = Number(r.buyerDeliveryFee);
          const cost = fee - Number(r.platformMarginAmount ?? 0);
          return fee > 0 ? cost / fee : null;
        })
        .filter((v: number | null): v is number => v !== null);
      if (!ratios.length) return null;
      const average = ratios.reduce((a: number, b: number) => a + b, 0) / ratios.length;
      return {
        averageCostToPriceRatio: Math.round(average * 10000) / 10000,
        threshold: config.fairness.maxBuyerPriceRatio,
        alert: average > config.fairness.maxBuyerPriceRatio,
        sampleSize: ratios.length,
      };
    } catch {
      return null;
    }
  }

  /** Driver KPI: estimated hourly rate per driver from match audits. */
  private async driverKpi(db: any, config: OptimizationConfig) {
    try {
      const rows = await db.logistics_DriverMatchAudit?.findMany?.({
        where: { eligible: true },
        select: { driverId: true, estimatedCompensationTzs: true, etaMinutes: true },
        orderBy: { matchedAt: 'desc' },
        take: 1000,
      });
      if (!rows?.length) return null;
      // Latest audit per driver.
      const latest = new Map<string, { compensation: number; etaMinutes: number }>();
      for (const r of rows) {
        if (!latest.has(r.driverId)) {
          latest.set(r.driverId, {
            compensation: Number(r.estimatedCompensationTzs),
            etaMinutes: Number(r.etaMinutes ?? 0),
          });
        }
      }
      const minimum = config.fairness.minimumDriverHourlyRateTzs;
      let below = 0;
      for (const { compensation, etaMinutes } of latest.values()) {
        const activeHours = Math.max(1 / 60, etaMinutes / 60 + 0.25);
        if (compensation / activeHours < minimum) below += 1;
      }
      return {
        driversBelowMinimumHourly: below,
        driversEvaluated: latest.size,
        minimumHourlyRateTzs: minimum,
        alert: below > 0,
      };
    } catch {
      return null;
    }
  }

  /** Vehicle KPI: average weight utilization per assigned job. */
  private async vehicleKpi(db: any, config: OptimizationConfig) {
    try {
      const jobs = await db.logistics_DeliveryJob?.findMany?.({
        where: { vehicleId: { not: null } },
        select: { id: true, vehicleId: true, shipmentIds: true },
        take: 1000,
      });
      if (!jobs?.length) return null;
      const utilizations: number[] = [];
      for (const job of jobs) {
        const vehicle = await db.logistics_Vehicle?.findUnique?.({
          where: { id: job.vehicleId },
          select: { maxWeightKg: true },
        });
        const maxKg = Number(vehicle?.maxWeightKg ?? 0);
        if (maxKg <= 0 || !job.shipmentIds?.length) continue;
        const shipments = await db.logistics_Shipment?.findMany?.({
          where: { id: { in: job.shipmentIds } },
          select: { packageWeightKg: true },
        });
        const usedKg = (shipments ?? []).reduce((s: number, x: any) => s + Number(x.packageWeightKg ?? 0), 0);
        utilizations.push(Math.min(1, usedKg / maxKg));
      }
      if (!utilizations.length) return null;
      const average = utilizations.reduce((a: number, b: number) => a + b, 0) / utilizations.length;
      return {
        averageUtilization: Math.round(average * 10000) / 10000,
        threshold: config.fairness.minVehicleUtilizationTarget,
        alert: average < config.fairness.minVehicleUtilizationTarget,
        jobsEvaluated: utilizations.length,
      };
    } catch {
      return null;
    }
  }

  /** Route KPI: 7-day revenue per km / per hour from audit records. */
  private async routeKpi(db: any, since: Date) {
    try {
      const rows = await db.logistics_PricingAuditRecord?.findMany?.({
        where: { recordedAt: { gte: since } },
        select: { buyerDeliveryFee: true, distanceKm: true, durationMinutes: true },
        take: 5000,
      });
      if (!rows?.length) return null;
      const perKm: number[] = [];
      const perHour: number[] = [];
      for (const r of rows) {
        const fee = Number(r.buyerDeliveryFee);
        const km = Number(r.distanceKm ?? 0);
        const hours = Number(r.durationMinutes ?? 0) / 60;
        if (km > 0) perKm.push(fee / km);
        if (hours > 0) perHour.push(fee / hours);
      }
      return {
        averageRevenuePerKmTzs: perKm.length
          ? Math.round(perKm.reduce((a: number, b: number) => a + b, 0) / perKm.length)
          : null,
        averageRevenuePerHourTzs: perHour.length
          ? Math.round(perHour.reduce((a: number, b: number) => a + b, 0) / perHour.length)
          : null,
        sampleSize: rows.length,
      };
    } catch {
      return null;
    }
  }

  /** Consolidation KPI: headline total savings across all audits. */
  private async consolidationKpi(db: any) {
    try {
      const rows = await db.logistics_ConsolidationAudit?.findMany?.({
        select: { totalSavingsTzs: true },
        take: 10000,
      });
      if (!rows) return null;
      const total = rows.reduce((s: number, r: any) => s + Number(r.totalSavingsTzs ?? 0), 0);
      return { totalSavingsTzs: Math.round(total), auditsCounted: rows.length };
    } catch {
      return null;
    }
  }
}
