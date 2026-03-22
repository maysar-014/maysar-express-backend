import { PrismaClient } from '@prisma/client';
import { IProductMatchAuditRepository, ProductMatchAudit } from '../../domain/repositories/repository.interfaces';

export class PrismaProductMatchAuditRepository implements IProductMatchAuditRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(audit: ProductMatchAudit): Promise<void> {
        const delegate = (this.prisma as any).catalog_ProductMatchAudit;
        if (!delegate || typeof delegate.upsert !== 'function') {
            return;
        }
        await delegate.upsert({
            where: { id: audit.id },
            create: {
                id: audit.id,
                candidateProductId: audit.candidateProductId,
                matchedProductId: audit.matchedProductId,
                matchLevel: audit.matchLevel as any,
                matchScore: audit.matchScore,
                matchingCriteria: audit.matchingCriteria,
                decision: audit.decision as any,
                decidedBy: audit.decidedBy as any,
                sellerId: audit.sellerId,
                metadata: audit.metadata,
                createdAt: audit.createdAt,
            },
            update: {
                decision: audit.decision as any,
                decidedBy: audit.decidedBy as any,
                metadata: audit.metadata,
            },
        });
    }

    async findById(id: string): Promise<ProductMatchAudit | null> {
        const delegate = (this.prisma as any).catalog_ProductMatchAudit;
        if (!delegate || typeof delegate.findUnique !== 'function') {
            return null;
        }
        const audit = await delegate.findUnique({
            where: { id },
        });
        return audit ? this.toDomain(audit) : null;
    }

    async findBySeller(sellerId: string, limit: number = 50): Promise<ProductMatchAudit[]> {
        const delegate = (this.prisma as any).catalog_ProductMatchAudit;
        if (!delegate || typeof delegate.findMany !== 'function') {
            return [];
        }
        const audits = await delegate.findMany({
            where: { sellerId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return audits.map(this.toDomain);
    }

    async findByMatchLevel(level: string): Promise<ProductMatchAudit[]> {
        const delegate = (this.prisma as any).catalog_ProductMatchAudit;
        if (!delegate || typeof delegate.findMany !== 'function') {
            return [];
        }
        const audits = await delegate.findMany({
            where: { matchLevel: level as any },
            orderBy: { createdAt: 'desc' },
        });
        return audits.map(this.toDomain);
    }

    private toDomain(prismaAudit: any): ProductMatchAudit {
        return {
            id: prismaAudit.id,
            candidateProductId: prismaAudit.candidateProductId,
            matchedProductId: prismaAudit.matchedProductId,
            matchLevel: prismaAudit.matchLevel,
            matchScore: Number(prismaAudit.matchScore),
            matchingCriteria: prismaAudit.matchingCriteria,
            decision: prismaAudit.decision,
            decidedBy: prismaAudit.decidedBy,
            sellerId: prismaAudit.sellerId,
            metadata: prismaAudit.metadata,
            createdAt: prismaAudit.createdAt,
        };
    }
}
