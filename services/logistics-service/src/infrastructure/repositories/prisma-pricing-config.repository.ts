import { PricingConfig, PricingConfigData } from '../../domain/value-objects/pricing-config.value-object';
import { PricingConfigRepository } from '../../domain/repositories/pricing-config.repository';

export class PrismaPricingConfigRepository implements PricingConfigRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async getActive(): Promise<PricingConfig> {
    const row = await this.prisma?.Logistics_PricingConfig?.findFirst?.({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!row) throw new Error('No active PricingConfig found. Run: npx tsx scripts/seed-pricing-config.ts');
    return this.rowToConfig(row);
  }

  async getByVersion(version: number): Promise<PricingConfig | null> {
    const row = await this.prisma?.Logistics_PricingConfig?.findUnique?.({ where: { version } });
    return row ? this.rowToConfig(row) : null;
  }

  async save(config: PricingConfig): Promise<void> {
    const data = config.toJSON();

    await this.prisma?.$transaction?.(async (tx: any) => {
      if (data.isActive) {
        await tx.Logistics_PricingConfig?.updateMany?.({
          where: { isActive: true, NOT: { version: data.version } },
          data: { isActive: false },
        });
      }

      await tx.Logistics_PricingConfig?.upsert?.({
        where: { version: data.version },
        update: this.toDbFields(data),
        create: { version: data.version, createdAt: data.createdAt, ...this.toDbFields(data) },
      });
    });
  }

  async getNextVersion(): Promise<number> {
    const result = await this.prisma?.Logistics_PricingConfig?.aggregate?.({
      _max: { version: true },
    });
    return (result?._max?.version ?? 0) + 1;
  }

  private toDbFields(data: PricingConfigData): Record<string, unknown> {
    return {
      platformMarginPct:     data.platformMarginPct,
      floorPriceTzs:         data.floorPriceTzs,
      ceilingPriceTzs:       data.ceilingPriceTzs,
      roundingIncrementTzs:  data.roundingIncrementTzs,
      codPolicy:             data.codPolicy as any,
      localUrban:            data.localUrban as any,
      metropolitan:          data.metropolitan as any,
      intercityCorridors:    data.intercityCorridors as any,
      intercityFallback:     (data.intercityFallback ?? null) as any,
      remoteUnavailable:     data.remoteUnavailable,
      quoteValiditySeconds:  data.quoteValiditySeconds,
      routingCacheTtlMs:     data.routingCacheTtlMs,
      isActive:              data.isActive,
    };
  }

  private rowToConfig(row: any): PricingConfig {
    const data: PricingConfigData = {
      version:            row.version,
      platformMarginPct:  Number(row.platformMarginPct),
      floorPriceTzs:      Number(row.floorPriceTzs),
      ceilingPriceTzs:    Number(row.ceilingPriceTzs),
      roundingIncrementTzs: row.roundingIncrementTzs,
      codPolicy:          row.codPolicy as any,
      localUrban:         row.localUrban as any,
      metropolitan:       row.metropolitan as any,
      intercityCorridors: row.intercityCorridors as any,
      intercityFallback:  (row.intercityFallback ?? null) as any,
      remoteUnavailable:  row.remoteUnavailable ?? false,
      quoteValiditySeconds: row.quoteValiditySeconds,
      routingCacheTtlMs:  row.routingCacheTtlMs,
      isActive:           row.isActive,
      createdAt:          row.createdAt,
    };
    return PricingConfig.fromPersisted(data);
  }
}
