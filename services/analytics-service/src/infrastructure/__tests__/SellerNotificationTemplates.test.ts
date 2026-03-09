const loggerMock = {
    info: jest.fn()
};

const mockPrisma = {
    notificationTemplate: {
        upsert: jest.fn()
    }
};

jest.mock(
    '@modules/auth-service/src/infrastructure/services/logger.service',
    () => ({
        logger: loggerMock
    }),
    { virtual: true }
);

jest.mock('../database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { seedSellerNotificationTemplates } from '../SellerNotificationTemplates';

describe('seedSellerNotificationTemplates', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.notificationTemplate.upsert.mockResolvedValue(undefined);
    });

    it('upserts all seller templates with default creation metadata', async () => {
        await seedSellerNotificationTemplates();

        expect(mockPrisma.notificationTemplate.upsert).toHaveBeenCalledTimes(7);
        expect(mockPrisma.notificationTemplate.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { name: 'seller_daily_revenue_update' },
                update: expect.objectContaining({
                    name: 'seller_daily_revenue_update',
                    subject: 'You earned {{amount}} today!'
                }),
                create: expect.objectContaining({
                    status: 'active',
                    locale: 'en',
                    createdBy: 'system'
                })
            })
        );
        expect(loggerMock.info).toHaveBeenCalledWith('Seller notification templates seeded successfully');
    });
});
