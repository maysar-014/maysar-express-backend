import { AnalyticsController } from '../AnalyticsController';
import { Request, Response } from 'express';

// Mock dependencies
const mockGetSellerDashboard = { execute: jest.fn() };
const mockGetSalesAnalytics = { execute: jest.fn() };
const mockGetSupplierAnalytics = { execute: jest.fn() };
const mockGetCourierAnalytics = { execute: jest.fn() };

describe('AnalyticsController', () => {
    let controller: AnalyticsController;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        controller = new AnalyticsController(
            mockGetSellerDashboard as any,
            mockGetSalesAnalytics as any,
            mockGetSupplierAnalytics as any,
            mockGetCourierAnalytics as any
        );

        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        res = { json, status };
        req = { params: {} };
    });

    describe('getSellerDashboardHandler', () => {
        it('should return dashboard data on success', async () => {
            req.params = { sellerId: '123' };
            const mockResult = { metrics: {} };
            mockGetSellerDashboard.execute.mockResolvedValue(mockResult);

            await controller.getSellerDashboardHandler(req as Request, res as Response);

            expect(mockGetSellerDashboard.execute).toHaveBeenCalledWith('123');
            expect(json).toHaveBeenCalledWith(mockResult);
        });

        it('should return 500 on error', async () => {
            req.params = { sellerId: '123' };
            mockGetSellerDashboard.execute.mockRejectedValue(new Error('Fail'));

            await controller.getSellerDashboardHandler(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ error: 'Fail' });
        });
    });

    describe('getSalesAnalyticsHandler', () => {
        it('should return sales data', async () => {
            req.params = { sellerId: '123' };
            const mockResult = [{ sales: 1 }];
            mockGetSalesAnalytics.execute.mockResolvedValue(mockResult);

            await controller.getSalesAnalyticsHandler(req as Request, res as Response);

            expect(mockGetSalesAnalytics.execute).toHaveBeenCalledWith('123');
            expect(json).toHaveBeenCalledWith(mockResult);
        });
    });

    // Additional tests for other handlers follow same pattern
});
