const mockPrisma = {
    notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    }
};

jest.mock('../../database/prisma-client', () => ({
    prisma: mockPrisma
}));

import { PrismaNotificationRepository } from '../prisma-notification.repository';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationContent } from '../../../domain/value-objects/notification-content.value-object';

describe('PrismaNotificationRepository', () => {
    let repository: PrismaNotificationRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PrismaNotificationRepository();
    });

    it('should create notification', async () => {
        (mockPrisma.notification.create as jest.Mock).mockResolvedValue({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            status: 'pending',
            priority: 'medium',
            subject: 'Test',
            content: 'Test content',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            content: NotificationContent.create('Test content')
        });

        const result = await repository.create(notification);

        expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should find notification by id', async () => {
        (mockPrisma.notification.findUnique as jest.Mock).mockResolvedValue({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            status: 'pending',
            priority: 'medium',
            subject: 'Test',
            content: 'Test content',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const result = await repository.findById('n1');

        expect(result).toBeDefined();
    });
});
