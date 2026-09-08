/**
 * Prisma FairnessFlag repository (Phase 6 §6.1). Append-only creation;
 * resolution is the only permitted mutation.
 */

import { FairnessFlagRepository, FairnessFlagInput } from '../../domain/repositories/fairness-flag.repository';
import { makeId } from '../../../../../shared/ids/id';

export class PrismaFairnessFlagRepository implements FairnessFlagRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(input: FairnessFlagInput): Promise<void> {
    await this.prisma?.logistics_FairnessFlag?.create?.({
      data: {
        id: makeId('ffl'),
        optionId: input.optionId ?? null,
        deliveryJobId: input.deliveryJobId ?? null,
        checkType: input.checkType,
        computedValue: input.computedValue,
        threshold: input.threshold,
        detail: input.detail ?? null,
      },
    });
  }

  async findUnresolved(): Promise<Array<Record<string, any>>> {
    const rows = await this.prisma?.logistics_FairnessFlag?.findMany?.({
      where: { resolvedAt: null },
      orderBy: { flaggedAt: 'desc' },
      take: 200,
    });
    return rows ?? [];
  }
}
