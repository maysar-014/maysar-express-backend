import { PrismaClient } from '@prisma/client';
import { IMatchConfirmationRepository, MatchConfirmation } from '../../domain/repositories/repository.interfaces';

export class PrismaMatchConfirmationRepository implements IMatchConfirmationRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(confirmation: MatchConfirmation): Promise<void> {
        await this.prisma.catalog_MatchConfirmation.create({
            data: {
                id: confirmation.id,
                auditId: confirmation.auditId,
                sellerId: confirmation.sellerId,
                candidateProducts: confirmation.candidateProducts,
                status: confirmation.status as any,
                sellerChoice: confirmation.sellerChoice,
                expiresAt: confirmation.expiresAt,
                respondedAt: confirmation.respondedAt,
                createdAt: confirmation.createdAt,
            },
        });
    }

    async findById(id: string): Promise<MatchConfirmation | null> {
        const confirmation = await this.prisma.catalog_MatchConfirmation.findUnique({
            where: { id },
        });
        return confirmation ? this.toDomain(confirmation) : null;
    }

    async findPendingBySeller(sellerId: string): Promise<MatchConfirmation[]> {
        const confirmations = await this.prisma.catalog_MatchConfirmation.findMany({
            where: {
                sellerId,
                status: 'PENDING',
            },
            orderBy: { createdAt: 'desc' },
        });
        return confirmations.map(this.toDomain);
    }

    async updateStatus(id: string, status: string, sellerChoice?: string): Promise<void> {
        await this.prisma.catalog_MatchConfirmation.update({
            where: { id },
            data: {
                status: status as any,
                sellerChoice,
                respondedAt: new Date(),
            },
        });
    }

    async findExpired(): Promise<MatchConfirmation[]> {
        const confirmations = await this.prisma.catalog_MatchConfirmation.findMany({
            where: {
                status: 'PENDING',
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        return confirmations.map(this.toDomain);
    }

    private toDomain(prismaConfirmation: any): MatchConfirmation {
        return {
            id: prismaConfirmation.id,
            auditId: prismaConfirmation.auditId,
            sellerId: prismaConfirmation.sellerId,
            candidateProducts: prismaConfirmation.candidateProducts,
            status: prismaConfirmation.status,
            sellerChoice: prismaConfirmation.sellerChoice,
            expiresAt: prismaConfirmation.expiresAt,
            respondedAt: prismaConfirmation.respondedAt,
            createdAt: prismaConfirmation.createdAt,
        };
    }
}
