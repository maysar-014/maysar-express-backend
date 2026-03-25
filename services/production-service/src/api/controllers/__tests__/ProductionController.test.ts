import { ProductionController } from '../ProductionController';
import { Request, Response } from 'express';

const mockCreatePlanUseCase = { execute: jest.fn() } as any;
const mockUpdateStatusUseCase = { execute: jest.fn() } as any;
const mockRecordQualityUseCase = { execute: jest.fn() } as any;
const mockGetDashboardUseCase = { execute: jest.fn() } as any;
const mockCalculateCapacityUseCase = { execute: jest.fn() } as any;
const mockUpdateCapacityUseCase = { execute: jest.fn() } as any;
const mockCreateBulkOrderRequestUseCase = { execute: jest.fn() } as any;
const mockListBulkOrderRequestsUseCase = { execute: jest.fn() } as any;
const mockGetBulkOrderRequestUseCase = { execute: jest.fn() } as any;
const mockSubmitBulkOrderQuoteUseCase = { execute: jest.fn() } as any;

describe('ProductionController', () => {
    let controller: ProductionController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ProductionController(
            mockCreatePlanUseCase,
            mockUpdateStatusUseCase,
            mockRecordQualityUseCase,
            mockGetDashboardUseCase,
            mockCalculateCapacityUseCase,
            mockUpdateCapacityUseCase,
            mockCreateBulkOrderRequestUseCase,
            mockListBulkOrderRequestsUseCase,
            mockGetBulkOrderRequestUseCase,
            mockSubmitBulkOrderQuoteUseCase
        );
        req = { body: {}, params: {}, query: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create production plan', async () => {
        req.body = { orderId: 'o1', quantity: 100 };
        mockCreatePlanUseCase.execute.mockResolvedValue({ id: 'plan1' });
        await controller.createPlan(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should list supplier bulk orders using the authenticated user when supplierId is omitted', async () => {
        req.query = {};
        (req as any).user = { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        mockListBulkOrderRequestsUseCase.execute.mockResolvedValue([{ id: 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV' }]);

        await controller.listBulkOrders(req as Request, res as Response);

        expect(mockListBulkOrderRequestsUseCase.execute).toHaveBeenCalledWith({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            status: undefined
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update supplier capacity using the authenticated user when supplierId is omitted', async () => {
        req.body = {
            maxCapacity: 12000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            unit: 'units',
            reason: 'Planner override'
        };
        (req as any).user = { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        mockUpdateCapacityUseCase.execute.mockResolvedValue({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            date: '2026-03-23T00:00:00.000Z',
            maxCapacity: 12000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            availableCapacity: 7000,
            utilizationRate: 41.67,
            unit: 'units',
            updatedAt: '2026-03-23T08:10:00.000Z'
        });

        await controller.updateCapacity(req as Request, res as Response);

        expect(mockUpdateCapacityUseCase.execute).toHaveBeenCalledWith({
            maxCapacity: 12000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            unit: 'units',
            reason: 'Planner override',
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            adjustedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when a bulk order request is not found', async () => {
        req.params = { id: 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FZZ' };
        mockGetBulkOrderRequestUseCase.execute.mockResolvedValue(null);

        await controller.getBulkOrder(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should submit a bulk order quote using the authenticated user when supplierId is omitted', async () => {
        req.params = { id: 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        req.body = {
            unitPrice: 3900,
            currency: 'TZS',
            leadTimeDays: 12,
            validUntil: '2026-04-01T09:00:00.000Z'
        };
        (req as any).user = { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        mockSubmitBulkOrderQuoteUseCase.execute.mockResolvedValue({
            request: { id: req.params.id },
            quote: { id: 'prd_bulquo_01ARZ3NDEKTSV4RRFFQ69G5FAV' }
        });

        await controller.submitBulkOrderQuote(req as Request, res as Response);

        expect(mockSubmitBulkOrderQuoteUseCase.execute).toHaveBeenCalledWith(req.params.id, {
            unitPrice: 3900,
            currency: 'TZS',
            leadTimeDays: 12,
            validUntil: '2026-04-01T09:00:00.000Z',
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
