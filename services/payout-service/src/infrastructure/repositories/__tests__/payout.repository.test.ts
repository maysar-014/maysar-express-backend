import { PayoutRepository } from '../payout.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    payout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

const mockPiiService = {
    encrypt: jest.fn((val) => val),
    decrypt: jest.fn((val) => val),
    hash: jest.fn((val) => val)
} as any;

describe('PayoutRepository', () => {
    let repository: PayoutRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PayoutRepository(mockPrisma, mockPiiService);
    });

    it('should create payout', async () => {
        (mockPrisma.payout.create as jest.Mock).mockResolvedValue({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            status: 'PENDING'
        });

        const mockPayout = { toObject: () => ({ id: 'p1' }) };
        const result = await repository.save(mockPayout as any);

        expect(mockPrisma.payout.create).toHaveBeenCalled();
    });

    it('should find payout by id', async () => {
        (mockPrisma.payout.findUnique as jest.Mock).mockResolvedValue({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            status: 'PENDING'
        });

        const result = await repository.findById('p1');

        expect(result).toBeDefined();
    });

    it('should tolerate legacy bank details payloads when mapping payouts', async () => {
        (mockPrisma.payout.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'p1',
                userId: 'usr_1',
                userRole: 'seller',
                amount: 100,
                currency: 'TZS',
                method: 'MOBILE_MONEY',
                status: 'PENDING',
                mobileMoneyDetails: {
                    provider: 'MPESA',
                    phoneNumber: '+255700000000',
                    accountName: 'Contract User'
                },
                bankDetails: {
                    bankName: 'Legacy Bank',
                    bankCode: '001',
                    accountNumber: '1234567890',
                    accountName: 'Contract User'
                },
                fee: 0,
                netAmount: 100
            }
        ]);

        const result = await repository.findByUserId('usr_1');

        expect(result).toHaveLength(1);
        expect(result[0].bankDetails).toEqual(expect.objectContaining({
            bankName: 'Legacy Bank',
            accountNumber: '1234567890'
        }));
        expect(mockPiiService.decrypt).not.toHaveBeenCalled();
    });

    it('should skip invalid legacy rows when listing payouts', async () => {
        (mockPrisma.payout.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'bad-1',
                userId: 'usr_1',
                userRole: 'buyer',
                amount: 100,
                currency: 'TZS',
                method: 'MOBILE_MONEY',
                status: 'PENDING',
                mobileMoneyDetails: {
                    provider: 'MPESA',
                    phoneNumber: '+255700000000',
                    accountName: 'Contract User'
                },
                fee: 0,
                netAmount: 100
            },
            {
                id: 'p1',
                userId: 'usr_1',
                userRole: 'seller',
                amount: 100,
                currency: 'TZS',
                method: 'MOBILE_MONEY',
                status: 'PENDING',
                mobileMoneyDetails: {
                    provider: 'MPESA',
                    phoneNumber: '+255700000000',
                    accountName: 'Contract User'
                },
                fee: 0,
                netAmount: 100
            }
        ]);

        const result = await repository.findByUserId('usr_1');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('p1');
    });
});
