import { Request, Response } from 'express';
import { CommissionController } from '../commission.controller';
import { CalculateCommissionUseCase } from '../../application/use-cases/calculate-commission.use-case';
import { ApproveCommissionUseCase } from '../../application/use-cases/approve-commission.use-case';
import { ICommissionRepository } from '../../domain/repositories/index';
import { CommissionFactory } from '../../../__tests__/factories/commission.factory';
import { CommissionId, SellerId } from '../../domain/value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../domain/value-objects/monetary.value-object';
import { CommissionType } from '../../domain/value-objects/commission-types.value-object';
import { RecipientType } from '../../domain/value-objects/recipient-types.value-object';

describe('CommissionController', () => {
    let controller: CommissionController;
    let mockCalculateUseCase: jest.Mocked<CalculateCommissionUseCase>;
    let mockApproveUseCase: jest.Mocked<ApproveCommissionUseCase>;
    let mockRepository: jest.Mocked<ICommissionRepository>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockCalculateUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CalculateCommissionUseCase>;
        mockApproveUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ApproveCommissionUseCase>;
        mockRepository = {
            findById: jest.fn(),
            findBySellerId: jest.fn(),
            findByStatus: jest.fn(),
            getCommissionSummary: jest.fn()
        } as unknown as jest.Mocked<ICommissionRepository>;

        controller = new CommissionController(
            mockCalculateUseCase,
            mockApproveUseCase,
            mockRepository
        );

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('calculateCommission', () => {
        it('should return 201 on success', async () => {
            const commission = CommissionFactory.create();
            mockCalculateUseCase.execute.mockResolvedValue({
                commission,
                breakdown: {
                    baseAmount: CommissionAmount.fromNumber(100),
                    bonus: CommissionAmount.fromNumber(20),
                    totalCommission: CommissionAmount.fromNumber(120),
                    appliedRate: CommissionRate.fromDecimal(0.12)
                },
                events: []
            });

            mockRequest = {
                body: {
                    orderId: CommissionId.create().toString(),
                    sellerId: SellerId.create().toString(),
                    orderAmount: 1000,
                    recipientType: RecipientType.SELLER,
                    commissionType: CommissionType.SALE
                }
            };

            await controller.calculateCommission(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    commissionId: commission.id.toString()
                })
            }));
        });

        it('should return 400 on error', async () => {
            mockCalculateUseCase.execute.mockRejectedValue(new Error('Validation failed'));
            mockRequest = { body: {} } as Request;

            await controller.calculateCommission(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Validation failed'
            }));
        });
    });

    describe('approveCommission', () => {
        it('should approve commission successfully', async () => {
            mockApproveUseCase.execute.mockResolvedValue({ success: true, events: [] });
            mockRequest = {
                params: { id: CommissionId.create().toString() },
                body: { autoSchedulePayout: true },
                user: { id: 'admin-1', role: 'admin' }
            } as unknown as Request;

            await controller.approveCommission(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ approved: true })
            }));
        });
    });

    describe('getCommission', () => {
        it('should return commission if found', async () => {
            const commission = CommissionFactory.create();
            mockRepository.findById.mockResolvedValue(commission);
            mockRequest = { params: { id: commission.id.toString() } } as unknown as Request;

            await controller.getCommission(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ id: commission.id.toString() })
            }));
        });

        it('should return 404 if not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            mockRequest = { params: { id: CommissionId.create().toString() } } as unknown as Request;

            await controller.getCommission(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getSellerCommissions', () => {
        it('should return list of commissions', async () => {
            const sellerId = SellerId.create();
            const commissions = [CommissionFactory.create({ sellerId })];
            mockRepository.findBySellerId.mockResolvedValue(commissions);
            mockRequest = {
                params: { sellerId: sellerId.toString() },
                query: {}
            } as unknown as Request;

            await controller.getSellerCommissions(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    total: 1
                })
            }));
        });
    });
});
