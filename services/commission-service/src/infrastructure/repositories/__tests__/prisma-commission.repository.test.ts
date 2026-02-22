import { PrismaClient } from '@prisma/client';
import { PrismaCommissionRepository } from '../prisma-commission.repository';
import { CommissionFactory } from '../../../__tests__/factories/commission.factory';
import { CommissionId, SellerId } from '../../../domain/value-objects/ids.value-object';
import { CommissionStatus } from '../../../domain/value-objects/commission-types.value-object';

describe('PrismaCommissionRepository', () => {
    let repository: PrismaCommissionRepository;
    let prismaMock: {
        commission: {
            upsert: jest.Mock;
            findUnique: jest.Mock;
            findMany: jest.Mock;
            update: jest.Mock;
            aggregate: jest.Mock;
        };
    };

    beforeEach(() => {
        prismaMock = {
            commission: {
                upsert: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                aggregate: jest.fn(),
            },
        };
        repository = new PrismaCommissionRepository(prismaMock as unknown as PrismaClient);
    });

    describe('save', () => {
        it('should upsert commission data', async () => {
            const commission = CommissionFactory.create();
            await repository.save(commission);

            expect(prismaMock.commission.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: commission.id.toString() },
                    create: expect.objectContaining({
                        id: commission.id.toString(),
                        amount: commission.amount.toNumber(),
                    }),
                })
            );
        });
    });

    describe('findById', () => {
        it('should return commission if found', async () => {
            const commission = CommissionFactory.create();
            prismaMock.commission.findUnique.mockResolvedValue({
                id: commission.id.toString(),
                orderId: commission.orderId.toString(),
                sellerId: commission.sellerId.toString(),
                amount: commission.amount.toNumber(),
                rate: commission.rate.toNumber(),
                type: commission.type,
                status: commission.status,
                createdAt: commission.createdAt,
                paidAt: null,
                payoutId: null,
                metadata: null,
            });

            const result = await repository.findById(commission.id);

            expect(result).toBeDefined();
            expect(result?.id.equals(commission.id)).toBe(true);
        });

        it('should return null if not found', async () => {
            prismaMock.commission.findUnique.mockResolvedValue(null);
            const result = await repository.findById(CommissionId.create());
            expect(result).toBeNull();
        });
    });

    describe('updateStatus', () => {
        it('should update commission status', async () => {
            const id = CommissionId.create();
            await repository.updateStatus(id, CommissionStatus.APPROVED);

            expect(prismaMock.commission.update).toHaveBeenCalledWith({
                where: { id: id.toString() },
                data: {
                    status: CommissionStatus.APPROVED,
                    paidAt: undefined,
                },
            });
        });
    });

    describe('getTotalCommissionForSeller', () => {
        it('should return sum of commission amounts', async () => {
            const sellerId = SellerId.create();
            prismaMock.commission.aggregate.mockResolvedValue({
                _sum: { amount: 150.50 },
            });

            const total = await repository.getTotalCommissionForSeller(sellerId);

            expect(total).toBe(150.50);
            expect(prismaMock.commission.aggregate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        sellerId: sellerId.toString(),
                    }),
                })
            );
        });
    });
});
