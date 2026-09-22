import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { EnablerEntity } from '../../domain/entities/enabler.entity';
import { Enabler_Status } from '@prisma/client';
import prisma from '../database/prisma-client';

export class PrismaEnablerRepository implements IEnablerRepository {

    async findById(id: string): Promise<EnablerEntity | null> {
        const data = await prisma.enabler_Profile.findUnique({ where: { id } });
        if (!data) return null;
        return this.mapToEntity(data);
    }

    async findByUserId(userId: string): Promise<EnablerEntity | null> {
        const data = await prisma.enabler_Profile.findUnique({ where: { userId } });
        if (!data) return null;
        return this.mapToEntity(data);
    }

    async findByCode(code: string): Promise<EnablerEntity | null> {
        const data = await prisma.enabler_Profile.findFirst({
            where: {
                OR: [
                    { enablerCode: code },
                    { enablerCodeShort: code }
                ]
            }
        });
        if (!data) return null;
        return this.mapToEntity(data);
    }

    async findByStatus(status: Enabler_Status): Promise<EnablerEntity[]> {
        const data = await prisma.enabler_Profile.findMany({ where: { status } });
        return data.map(this.mapToEntity);
    }

    async save(enabler: EnablerEntity): Promise<void> {
        const data = enabler.toPlainObject();
        await prisma.enabler_Profile.create({
            data: {
                id: data.id,
                userId: data.userId,
                enablerCode: data.enablerCode || null,
                enablerCodeShort: data.enablerCodeShort || null,
                businessName: data.businessName,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                businessDescription: data.businessDescription,
                status: data.status,
                verificationStatus: data.verificationStatus,
                tier: data.tier,
                commissionRate: data.commissionRate,
                totalSales: data.totalSales,
                totalOrders: data.totalOrders,
                conversionRate: data.conversionRate,
                totalCommissionEarned: data.totalCommissionEarned,
                taxId: data.taxId,
                approvedBy: data.approvedBy,
                approvedAt: data.approvedAt,
                // Enabler capability: activation requirements + lifecycle (§4–§6)
                termsVersion: data.termsVersion ?? null,
                termsAcceptedAt: data.termsAcceptedAt ?? null,
                trainingStatus: data.trainingStatus ?? 'not_started',
                trainingCompletedAt: data.trainingCompletedAt ?? null,
                activatedAt: data.activatedAt ?? null,
                restrictedAt: data.restrictedAt ?? null,
                restrictedReason: data.restrictedReason ?? null,
                suspendedAt: data.suspendedAt ?? null,
                suspendedReason: data.suspendedReason ?? null,
                deactivatedAt: data.deactivatedAt ?? null,
                deactivatedReason: data.deactivatedReason ?? null,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            }
        });
    }

    async update(enabler: EnablerEntity): Promise<void> {
        const data = enabler.toPlainObject();
        await prisma.enabler_Profile.update({
            where: { id: data.id },
            data: {
                status: data.status,
                tier: data.tier,
                commissionRate: data.commissionRate,
                verificationStatus: data.verificationStatus,
                enablerCode: data.enablerCode || null,
                enablerCodeShort: data.enablerCodeShort || null,
                totalSales: data.totalSales,
                totalOrders: data.totalOrders,
                conversionRate: data.conversionRate,
                customerRating: data.customerRating,
                totalCommissionEarned: data.totalCommissionEarned,
                approvedBy: data.approvedBy,
                approvedAt: data.approvedAt,
                rejectionReason: data.rejectionReason,
                // Activation requirements + lifecycle state (§4–§6). Explicit
                // nulls are persisted so clearing a suspension/reactivation is
                // recorded rather than silently skipped.
                termsVersion: data.termsVersion ?? null,
                termsAcceptedAt: data.termsAcceptedAt ?? null,
                trainingStatus: data.trainingStatus ?? 'not_started',
                trainingCompletedAt: data.trainingCompletedAt ?? null,
                activatedAt: data.activatedAt ?? null,
                restrictedAt: data.restrictedAt ?? null,
                restrictedReason: data.restrictedReason ?? null,
                suspendedAt: data.suspendedAt ?? null,
                suspendedReason: data.suspendedReason ?? null,
                deactivatedAt: data.deactivatedAt ?? null,
                deactivatedReason: data.deactivatedReason ?? null,
                metadata: data.metadata || undefined,
                updatedAt: new Date()
            }
        });
    }

    private mapToEntity(data: any): EnablerEntity {
        return EnablerEntity.create({
            ...data,
            commissionRate: Number(data.commissionRate),
            totalSales: Number(data.totalSales),
            conversionRate: Number(data.conversionRate),
            customerRating: data.customerRating ? Number(data.customerRating) : null,
            totalCommissionEarned: Number(data.totalCommissionEarned)
        });
    }
}
