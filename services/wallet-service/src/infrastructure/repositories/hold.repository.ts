import { PrismaClient, Wallet_Hold, Wallet_HoldStatus } from '@prisma/client';
import { IHoldRepository } from '../../domain/repositories/hold.repository';
import { Hold, HoldStatus } from '../../domain/entities/hold.entity';
import { Money } from '../../domain/value-objects/money.value-object';

export class HoldRepository implements IHoldRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(hold: Hold): Promise<void> {
        const data = {
            id: hold.id,
            walletId: hold.walletId,
            userId: hold.userId,
            amount: hold.amount.toMajor(), // Store as major units for Decimal(10,2)
            currency: hold.amount.currency,
            reason: hold.reason,
            status: this.mapToPrismaStatus(hold.status),
            expiresAt: hold.expiresAt,
            isCaptured: hold.isCaptured,
            isReleased: hold.isReleased,
            createdAt: hold.createdAt,
            updatedAt: hold.updatedAt,
            metadata: hold.metadata || {}
        };

        // Upsert to handle both create and update
        await this.prisma.wallet_Hold.upsert({
            where: { id: hold.id },
            create: data,
            update: data
        });
    }

    async findById(id: string): Promise<Hold | null> {
        const record = await this.prisma.wallet_Hold.findUnique({
            where: { id }
        });
        return record ? this.toDomain(record) : null;
    }

    async findActiveByWalletId(walletId: string): Promise<Hold[]> {
        const records = await this.prisma.wallet_Hold.findMany({
            where: {
                walletId,
                status: 'ACTIVE',
                expiresAt: { gt: new Date() }
            }
        });
        return records.map(r => this.toDomain(r));
    }

    async findExpired(limit: number = 100): Promise<Hold[]> {
        const records = await this.prisma.wallet_Hold.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lte: new Date() }
            },
            take: limit
        });
        return records.map(r => this.toDomain(r));
    }

    async update(hold: Hold): Promise<void> {
        await this.save(hold); // upsert handles update
    }

    private toDomain(record: Wallet_Hold): Hold {
        return new Hold({
            id: record.id,
            walletId: record.walletId,
            userId: record.userId,
            amount: Money.fromMajor(Number(record.amount), record.currency), // Convert major from Decimal(10,2) to minor
            reason: record.reason,
            status: this.mapToDomainStatus(record.status),
            expiresAt: record.expiresAt,
            isCaptured: record.isCaptured,
            isReleased: record.isReleased,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            metadata: (record.metadata as Record<string, unknown> | null) || undefined
        });
    }

    private mapToPrismaStatus(status: HoldStatus): Wallet_HoldStatus {
        return status as unknown as Wallet_HoldStatus;
    }

    private mapToDomainStatus(status: Wallet_HoldStatus): HoldStatus {
        return status as unknown as HoldStatus;
    }
}
