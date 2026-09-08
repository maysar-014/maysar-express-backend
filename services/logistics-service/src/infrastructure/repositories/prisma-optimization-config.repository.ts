/**
 * Prisma repository for the versioned OptimizationConfig (Phase 4 §4.2).
 * `save()` always creates a NEW version (max+1) and deactivates previous
 * versions — no in-place overwrites of the weights, ever.
 */

import {
  OptimizationConfig,
  OptimizationConfigData,
} from '../../domain/value-objects/optimization-config.value-object';

export class PrismaOptimizationConfigRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async findActive(): Promise<OptimizationConfig | null> {
    const row = await this.prisma?.logistics_OptimizationConfig?.findFirst?.({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    return row ? this.rowToEntity(row) : null;
  }

  async findByVersion(version: number): Promise<OptimizationConfig | null> {
    const row = await this.prisma?.logistics_OptimizationConfig?.findUnique?.({ where: { version } });
    return row ? this.rowToEntity(row) : null;
  }

  /** All versions, ascending — full config history stays queryable. */
  async findVersions(): Promise<OptimizationConfig[]> {
    const rows = await this.prisma?.logistics_OptimizationConfig?.findMany?.({
      orderBy: { version: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  /**
   * Creates the next version and deactivates all others. The new config's
   * version is computed as max(existing)+1 (any explicit version greater than
   * existing is honoured).
   */
  async save(config: OptimizationConfig): Promise<OptimizationConfig> {
    const data = config.toData();
    const existing = await this.prisma?.logistics_OptimizationConfig?.findMany?.({
      select: { version: true },
    });
    const maxVersion = (existing ?? []).reduce((max: number, r: any) => Math.max(max, Number(r.version)), 0);
    const versionToSave = data.version > maxVersion ? data.version : maxVersion + 1;

    const created = await this.prisma?.logistics_OptimizationConfig?.create?.({
      data: {
        id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        version: versionToSave,
        buyerCostWeight: data.buyerCostWeight,
        deliveryTimeWeight: data.deliveryTimeWeight,
        vehicleUtilizationWeight: data.vehicleUtilizationWeight,
        failureRiskWeight: data.failureRiskWeight,
        driverEfficiencyWeight: data.driverEfficiencyWeight,
        maysarMarginWeight: data.maysarMarginWeight,
        maysarAbsorbsUpToTzs: data.maysarAbsorbsUpToTzs,
        customerChargeableVarianceTypes: data.customerChargeableVarianceTypes,
        maxBuyerPriceRatio: data.maxBuyerPriceRatio,
        minimumDriverHourlyRateTzs: data.minimumDriverHourlyRateTzs,
        minVehicleUtilizationTarget: data.minVehicleUtilizationTarget,
        isActive: true,
      },
    });

    // Deactivate every other version (no weight values are ever edited).
    if (existing?.length) {
      await this.prisma?.logistics_OptimizationConfig?.updateMany?.({
        where: { version: { not: versionToSave }, isActive: true },
        data: { isActive: false },
      });
    }

    return this.rowToEntity(created);
  }

  private rowToEntity(row: any): OptimizationConfig {
    const data: OptimizationConfigData = {
      version: Number(row.version),
      buyerCostWeight: Number(row.buyerCostWeight),
      deliveryTimeWeight: Number(row.deliveryTimeWeight),
      vehicleUtilizationWeight: Number(row.vehicleUtilizationWeight),
      failureRiskWeight: Number(row.failureRiskWeight),
      driverEfficiencyWeight: Number(row.driverEfficiencyWeight),
      maysarMarginWeight: Number(row.maysarMarginWeight),
      maysarAbsorbsUpToTzs: Number(row.maysarAbsorbsUpToTzs ?? 0),
      customerChargeableVarianceTypes: (row.customerChargeableVarianceTypes ?? []) as string[],
      maxBuyerPriceRatio: Number(row.maxBuyerPriceRatio ?? 1.5),
      minimumDriverHourlyRateTzs: Number(row.minimumDriverHourlyRateTzs ?? 3000),
      minVehicleUtilizationTarget: Number(row.minVehicleUtilizationTarget ?? 0.5),
      isActive: row.isActive ?? true,
    };
    return new OptimizationConfig(data);
  }
}