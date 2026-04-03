import { PrismaClient } from '@prisma/client';
import { IPayoutRepository } from '../../domain/ports/payout.repository.port';
import { Payout, PayoutStatus, PayoutMethod } from '../../domain/entities/payout.entity';
import type { BankDetails } from '../../domain/entities/payout.entity';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';

export class PayoutRepository implements IPayoutRepository {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly piiService: PiiEncryptionService
    ) { }

    async save(payout: Payout): Promise<void> {
        const data = payout.toObject();

        await this.prisma.payout.create({
            data: {
                id: data.id,
                userId: data.userId,
                userRole: data.userRole,
                amount: data.amount,
                currency: data.currency,
                method: data.method as any,
                status: data.status as any,
                bankDetails: data.bankDetails ? this.piiService.encrypt(JSON.stringify(data.bankDetails)) as any : undefined,
                mobileMoneyDetails: data.mobileMoneyDetails as any,
                reference: data.reference,
                processedAt: data.processedAt,
                completedAt: data.completedAt,
                failedAt: data.failedAt,
                failureReason: data.failureReason,
                fee: data.fee,
                netAmount: data.netAmount,
                metadata: data.metadata as any,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
        });
    }

    async findById(id: string): Promise<Payout | null> {
        const data = await this.prisma.payout.findUnique({
            where: { id }
        });

        if (!data) return null;

        return this.tryMapToEntity(data);
    }

    async findByUserId(userId: string, limit: number = 20): Promise<Payout[]> {
        const data = await this.prisma.payout.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return data
            .map((item: any) => this.tryMapToEntity(item))
            .filter((item): item is Payout => item !== null);
    }

    async findByUserIdAndRole(userId: string, userRole: string, limit: number = 20): Promise<Payout[]> {
        const data = await this.prisma.payout.findMany({
            where: { userId, userRole },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return data
            .map((item: any) => this.tryMapToEntity(item))
            .filter((item): item is Payout => item !== null);
    }

    async update(payout: Payout): Promise<void> {
        const data = payout.toObject();

        await this.prisma.payout.update({
            where: { id: data.id },
            data: {
                status: data.status as any,
                reference: data.reference,
                processedAt: data.processedAt,
                completedAt: data.completedAt,
                failedAt: data.failedAt,
                failureReason: data.failureReason,
                bankDetails: data.bankDetails ? this.piiService.encrypt(JSON.stringify(data.bankDetails)) as any : undefined,
                metadata: data.metadata as any,
                updatedAt: new Date(),
            }
        });
    }

    private parseBankDetails(value: unknown): BankDetails | undefined {
        if (!value) {
            return undefined;
        }

        if (typeof value === 'object') {
            return value as BankDetails;
        }

        if (typeof value !== 'string') {
            return undefined;
        }

        const candidates: string[] = [];
        if (value.includes(':')) {
            try {
                candidates.push(this.piiService.decrypt(value));
            } catch {
                // Fall back to the raw value below.
            }
        }
        candidates.push(value);

        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed as BankDetails;
                }
            } catch {
                // Try the next representation.
            }
        }

        return undefined;
    }

    private tryMapToEntity(data: any): Payout | null {
        try {
            return this.mapToEntity(data);
        } catch {
            return null;
        }
    }

    private mapToEntity(data: any): Payout {
        const amount = Number(data.amount ?? 0);
        const fee = Number(data.fee ?? 0);
        const netAmount = Number(
            data.netAmount ?? (Number.isFinite(amount) && Number.isFinite(fee) ? amount - fee : 0)
        );

        return new Payout({
            id: data.id,
            userId: data.userId ?? data.recipientId ?? '',
            userRole: data.userRole ?? 'seller',
            amount,
            currency: data.currency,
            method: PayoutRepository.normalizeMethod(data.method),
            status: PayoutRepository.normalizeStatus(data.status),
            bankDetails: this.parseBankDetails(data.bankDetails),
            mobileMoneyDetails: data.mobileMoneyDetails as any,
            reference: data.reference,
            processedAt: data.processedAt,
            completedAt: data.completedAt,
            failedAt: data.failedAt,
            failureReason: data.failureReason,
            fee,
            netAmount,
            metadata: data.metadata as any,
            createdAt: data.createdAt ?? new Date(),
            updatedAt: data.updatedAt ?? new Date(),
        });
    }

    private static normalizeMethod(method: unknown): PayoutMethod {
        const normalized = String(method ?? PayoutMethod.BANK_TRANSFER).trim().replace(/-/g, '_').toUpperCase();
        return Object.values(PayoutMethod).includes(normalized as PayoutMethod)
            ? (normalized as PayoutMethod)
            : PayoutMethod.BANK_TRANSFER;
    }

    private static normalizeStatus(status: unknown): PayoutStatus {
        const normalized = String(status ?? PayoutStatus.PENDING).trim().toUpperCase();
        return Object.values(PayoutStatus).includes(normalized as PayoutStatus)
            ? (normalized as PayoutStatus)
            : PayoutStatus.PENDING;
    }
}
