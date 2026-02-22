import { PrismaNotificationRepository } from '../prisma-notification.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    }
} as unknown as PrismaClient;

describe('PrismaNotificationRepository', () => {
    let repository: PrismaNotificationRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PrismaNotificationRepository(mockPrisma);
    });

    it('should create notification', async () => {
        (mockPrisma.notification.create as jest.Mock).mockResolvedValue({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            status: 'pending'
        });

        const result = await repository.create({} as any);

        expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should find notification by id', async () => {
        (mockPrisma.notification.findUnique as jest.Mock).mockResolvedValue({
            id: 'n1',
            userId: 'u1'
        });

        const result = await repository.findById('n1');

        expect(result).toBeDefined();
    });
});
