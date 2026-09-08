/**
 * Prisma BuyerProfile repository (Phase 6 §6.3).
 *
 * recordOutcome() upserts the profile and recomputes:
 *   - deliverySuccessRate = completed / (completed + failed) — the new
 *     observation is included, so the rate converges from the 0.80 default
 *   - typicalOrderWeightKg = incremental mean over completed deliveries
 *   - preferredDeliveryWindows = JSON histogram of window buckets
 *   - consolidationAcceptanceRate = shared choices / total Maysar choices
 */

import { BuyerProfileRepository, BuyerProfileRow, BuyerDeliveryOutcome } from '../../domain/repositories/buyer-profile.repository';
import { makeId } from '../../../../../shared/ids/id';

export class PrismaBuyerProfileRepository implements BuyerProfileRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async findByBuyerId(buyerId: string): Promise<BuyerProfileRow | null> {
    const row = await this.prisma?.logistics_BuyerProfile?.findUnique?.({ where: { buyerId } });
    return row ? this.toRow(row) : null;
  }

  async recordOutcome(buyerId: string, outcome: BuyerDeliveryOutcome): Promise<BuyerProfileRow> {
    const db = this.prisma;
    if (!db?.logistics_BuyerProfile) {
      throw new Error('BuyerProfile store unavailable');
    }

    const existing = await db.logistics_BuyerProfile.findUnique({ where: { buyerId } });
    const completed = Number(existing?.completedDeliveries ?? 0) + (outcome.success ? 1 : 0);
    const failed = Number(existing?.failedDeliveries ?? 0) + (outcome.success ? 0 : 1);
    const total = completed + failed;
    const successRate = total > 0 ? Math.round((completed / total) * 1000) / 1000 : 0.8;

    // Incremental mean weight over completed deliveries.
    const prevWeight = Number(existing?.typicalOrderWeightKg ?? 0);
    const prevCompleted = Number(existing?.completedDeliveries ?? 0);
    const typicalWeight =
      outcome.success && outcome.weightKg != null
        ? Math.round(((prevWeight * prevCompleted + outcome.weightKg) / (prevCompleted + 1)) * 1000) / 1000
        : prevWeight;

    // Window histogram.
    const windows: Record<string, number> = { ...(existing?.preferredDeliveryWindows ?? {}) };
    if (outcome.windowBucket) {
      windows[outcome.windowBucket] = Number(windows[outcome.windowBucket] ?? 0) + 1;
    }

    // Consolidation acceptance: fraction of Maysar choices that were shared.
    const prevShared = Number(existing?.preferredDeliveryWindows?.__shared ?? 0);
    const prevTotal = Number(existing?.preferredDeliveryWindows?.__maysarTotal ?? 0);
    let consolidationRate = Number(existing?.consolidationAcceptanceRate ?? 0);
    if (outcome.choseShared !== undefined) {
      const shared = prevShared + (outcome.choseShared ? 1 : 0);
      const maysarTotal = prevTotal + 1;
      consolidationRate = maysarTotal > 0 ? Math.round((shared / maysarTotal) * 1000) / 1000 : 0;
      windows.__shared = shared;
      windows.__maysarTotal = maysarTotal;
    }

    const data = {
      deliverySuccessRate: successRate,
      completedDeliveries: completed,
      failedDeliveries: failed,
      typicalOrderWeightKg: typicalWeight,
      consolidationAcceptanceRate: consolidationRate,
      preferredDeliveryWindows: windows,
      lastUpdatedAt: new Date(),
    };

    const row = await db.logistics_BuyerProfile.upsert({
      where: { buyerId },
      update: data,
      create: { id: makeId('byp'), buyerId, ...data },
    });
    return this.toRow(row);
  }

  private toRow(row: any): BuyerProfileRow {
    const windows = { ...(row.preferredDeliveryWindows ?? {}) };
    delete windows.__shared;
    delete windows.__maysarTotal;
    return {
      buyerId: row.buyerId,
      deliverySuccessRate: Number(row.deliverySuccessRate),
      completedDeliveries: Number(row.completedDeliveries ?? 0),
      failedDeliveries: Number(row.failedDeliveries ?? 0),
      typicalOrderWeightKg: Number(row.typicalOrderWeightKg ?? 0),
      consolidationAcceptanceRate: Number(row.consolidationAcceptanceRate ?? 0),
      preferredDeliveryWindows: windows,
      pickupPreference: String(row.pickupPreference ?? 'DELIVERY'),
    };
  }
}
