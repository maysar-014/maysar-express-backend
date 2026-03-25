import { Prisma, PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { CapacitySnapshotResponseDto, UpdateProductionCapacityDto } from '../../application/dto/capacity.dto';
import { ICapacityRepository } from '../../application/interfaces/ICapacityRepository';
import { ProductionCapacity } from '../../domain/value-objects/production-capacity.value-object';

type CapacitySnapshotRecord = {
    id: string;
    supplierId: string;
    date: Date;
    maxCapacity: Prisma.Decimal | number | string;
    usedCapacity: Prisma.Decimal | number | string;
    reservedCapacity: Prisma.Decimal | number | string;
    unit: string;
    adjustedBy: string | null;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
};

interface CapacitySnapshotDelegate {
    findUnique(args: Record<string, unknown>): Promise<CapacitySnapshotRecord | null>;
    findFirst(args: Record<string, unknown>): Promise<CapacitySnapshotRecord | null>;
    upsert(args: Record<string, unknown>): Promise<CapacitySnapshotRecord>;
}

const toNumber = (value: Prisma.Decimal | number | string): number => Number(value);

export class CapacityRepository implements ICapacityRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async getSnapshot(supplierId: string, date = new Date()): Promise<CapacitySnapshotResponseDto> {
        const normalizedDate = this.normalizeDate(date);
        const existing = await this.delegate.findUnique({
            where: {
                supplierId_date: {
                    supplierId,
                    date: normalizedDate
                }
            }
        });

        if (existing) {
            return this.toSnapshot(existing);
        }

        const latest = await this.delegate.findFirst({
            where: { supplierId },
            orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }]
        });

        if (latest) {
            return this.toSnapshot(latest);
        }

        return this.toSnapshot({
            id: makeId(getModelPrefix('Production_CapacitySnapshot')),
            supplierId,
            date: normalizedDate,
            maxCapacity: 0,
            usedCapacity: 0,
            reservedCapacity: 0,
            unit: 'units',
            adjustedBy: null,
            reason: null,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    async updateSnapshot(input: UpdateProductionCapacityDto): Promise<CapacitySnapshotResponseDto> {
        const normalizedDate = this.normalizeDate(input.date ? new Date(input.date) : new Date());
        const capacity = new ProductionCapacity({
            maxCapacity: input.maxCapacity,
            usedCapacity: input.usedCapacity,
            reservedCapacity: input.reservedCapacity,
            unit: input.unit
        });

        const record = await this.delegate.upsert({
            where: {
                supplierId_date: {
                    supplierId: input.supplierId,
                    date: normalizedDate
                }
            },
            update: {
                maxCapacity: capacity.maxCapacity,
                usedCapacity: capacity.usedCapacity,
                reservedCapacity: capacity.reservedCapacity,
                unit: capacity.unit,
                adjustedBy: input.adjustedBy,
                reason: input.reason
            },
            create: {
                id: makeId(getModelPrefix('Production_CapacitySnapshot')),
                supplierId: input.supplierId,
                date: normalizedDate,
                maxCapacity: capacity.maxCapacity,
                usedCapacity: capacity.usedCapacity,
                reservedCapacity: capacity.reservedCapacity,
                unit: capacity.unit,
                adjustedBy: input.adjustedBy,
                reason: input.reason
            }
        });

        return this.toSnapshot(record);
    }

    private toSnapshot(record: CapacitySnapshotRecord): CapacitySnapshotResponseDto {
        const capacity = new ProductionCapacity({
            maxCapacity: toNumber(record.maxCapacity),
            usedCapacity: toNumber(record.usedCapacity),
            reservedCapacity: toNumber(record.reservedCapacity),
            unit: record.unit
        });

        return {
            supplierId: record.supplierId,
            date: record.date.toISOString(),
            maxCapacity: capacity.maxCapacity,
            usedCapacity: capacity.usedCapacity,
            reservedCapacity: capacity.reservedCapacity,
            availableCapacity: capacity.availableCapacity,
            utilizationRate: Number(capacity.utilizationRate.toFixed(2)),
            unit: capacity.unit,
            adjustedBy: record.adjustedBy ?? undefined,
            reason: record.reason ?? undefined,
            updatedAt: record.updatedAt.toISOString()
        };
    }

    private normalizeDate(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    private get delegate(): CapacitySnapshotDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = client.production_CapacitySnapshot as CapacitySnapshotDelegate | undefined;
        if (!delegate) {
            throw new Error('Production capacity snapshot delegate is not configured on prisma client');
        }
        return delegate;
    }
}
