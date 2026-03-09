const mockPrisma = {
    notification: {
        create: jest.fn()
    }
};

jest.mock('../database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { SellerNotificationTrigger } from '../SellerNotificationTrigger';

describe('SellerNotificationTrigger', () => {
    let trigger: SellerNotificationTrigger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.notification.create.mockResolvedValue(undefined);
        trigger = new SellerNotificationTrigger();
    });

    it('sends daily revenue update only when order threshold is met', async () => {
        await trigger.triggerDailyRevenueUpdate('seller-1', 200, 4);
        expect(mockPrisma.notification.create).not.toHaveBeenCalled();

        await trigger.triggerDailyRevenueUpdate('seller-1', 200, 5);
        expect(mockPrisma.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'seller-1',
                    subject: 'You earned 200 today!'
                })
            })
        );
    });

    it('sends restock alerts only for urgent stockout windows', async () => {
        await trigger.triggerRestockAlert('seller-1', 'Product A', 5);
        expect(mockPrisma.notification.create).not.toHaveBeenCalled();

        await trigger.triggerRestockAlert('seller-1', 'Product A', 2);
        expect(mockPrisma.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    subject: 'Restock Alert: Product A'
                })
            })
        );
    });

    it('sends inquiry notifications based on pending count and priority', async () => {
        await trigger.triggerPendingInquiries('seller-1', 1);
        expect(mockPrisma.notification.create).not.toHaveBeenCalled();

        await trigger.triggerPendingInquiries('seller-1', 2);
        await trigger.triggerPendingInquiries('seller-1', 6);

        expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
        expect(mockPrisma.notification.create).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                data: expect.objectContaining({
                    subject: '2 customer questions waiting'
                })
            })
        );
        expect(mockPrisma.notification.create).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                data: expect.objectContaining({
                    subject: '6 customer questions waiting'
                })
            })
        );
    });

    it('always sends payout scheduled notifications', async () => {
        const date = new Date('2026-01-10T00:00:00.000Z');
        await trigger.triggerPayoutScheduled('seller-1', 1000, 850, 150, date);

        expect(mockPrisma.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'seller-1',
                    subject: 'Payout of 1000 scheduled'
                })
            })
        );
    });

    it('sends profitability updates only for healthy scores', async () => {
        await trigger.triggerProfitabilityScoreUpdate('seller-1', 65, 'Fair', 'Improve conversion');
        expect(mockPrisma.notification.create).not.toHaveBeenCalled();

        await trigger.triggerProfitabilityScoreUpdate('seller-1', 75, 'Good', 'Keep momentum');
        expect(mockPrisma.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    subject: 'Your Business Health Score: 75/100'
                })
            })
        );
    });
});
