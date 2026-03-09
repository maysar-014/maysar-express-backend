const mockPrisma = {
    user_User: {
        findMany: jest.fn()
    }
};

const generateActionCenterExecuteMock = jest.fn();
const triggerRestockAlertMock = jest.fn();

jest.mock('../database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

jest.mock('../../application/use-cases/GenerateActionCenter', () => ({
    GenerateActionCenter: jest.fn().mockImplementation(() => ({
        execute: generateActionCenterExecuteMock
    }))
}));

jest.mock('../SellerNotificationTrigger', () => ({
    SellerNotificationTrigger: jest.fn().mockImplementation(() => ({
        triggerRestockAlert: triggerRestockAlertMock
    }))
}));

import { ActionCenterGenerationJob } from '../ActionCenterGenerationJob';

describe('ActionCenterGenerationJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('executes action generation and triggers restock notifications', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        mockPrisma.user_User.findMany.mockResolvedValue([{ id: 'seller-1' }, { id: 'seller-2' }]);
        generateActionCenterExecuteMock
            .mockResolvedValueOnce([
                { type: 'RESTOCK', priority: 'HIGH', productId: 'product-1' },
                { type: 'PRICE_ADJUSTMENT', priority: 'MEDIUM' }
            ])
            .mockResolvedValueOnce([]);

        const job = new ActionCenterGenerationJob();
        await job.execute();

        expect(mockPrisma.user_User.findMany).toHaveBeenCalledWith({
            where: { role: 'SELLER', status: 'ACTIVE' },
            select: { id: true }
        });
        expect(generateActionCenterExecuteMock).toHaveBeenNthCalledWith(1, 'seller-1');
        expect(generateActionCenterExecuteMock).toHaveBeenNthCalledWith(2, 'seller-2');
        expect(triggerRestockAlertMock).toHaveBeenCalledWith('seller-1', 'product-1', 3);
        expect(logSpy).toHaveBeenCalledWith('[ActionCenterGenerationJob] Completed for 2 sellers');

        logSpy.mockRestore();
    });

    it('logs errors without throwing', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const failure = new Error('db unavailable');
        mockPrisma.user_User.findMany.mockRejectedValue(failure);

        const job = new ActionCenterGenerationJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalledWith('[ActionCenterGenerationJob] Error:', failure);

        errorSpy.mockRestore();
    });
});
