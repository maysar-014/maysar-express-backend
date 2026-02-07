import { PrismaClient } from '@prisma/client';
import { IIdempotencyRepository } from '../../domain/repositories/idempotency.repository';

export class IdempotencyRepository implements IIdempotencyRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async get(key: string): Promise<string | null> {
        const record = await this.prisma.wallet_IdempotencyRecord.findUnique({
            where: { key }
        });

        if (!record) return null;

        // Check expiry
        if (record.expiresAt < new Date()) {
            await this.delete(key);
            return null;
        }

        return JSON.stringify(record.result);
    }

    async save(key: string, value: string): Promise<void> {
        await this.prisma.wallet_IdempotencyRecord.create({
            data: {
                key,
                result: JSON.parse(value), // Storing as Json
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h retention
            }
        });
    }

    async delete(key: string): Promise<void> {
        await this.prisma.wallet_IdempotencyRecord.delete({
            where: { key }
        }).catch(() => {
            // Ignore if not found
        });
    }
}
