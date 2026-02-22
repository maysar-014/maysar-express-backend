import { Request, Response, NextFunction } from 'express';
import {
    validateCalculateCommission,
    validateApproveCommission,
    validateSellerId,
} from '../validation.middleware';
import { v4 as uuidv4 } from 'uuid';

describe('Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        nextFunction = jest.fn();
    });

    describe('validateCalculateCommission', () => {
        it('should call next() for valid input', () => {
            mockRequest = {
                body: {
                    orderId: uuidv4(),
                    sellerId: uuidv4(),
                    orderAmount: 100,
                    recipientType: 'seller',
                    commissionType: 'sale'
                }
            };

            validateCalculateCommission(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 400 for invalid orderId', () => {
            mockRequest = {
                body: {
                    orderId: 'invalid-uuid',
                    sellerId: uuidv4(),
                    orderAmount: 100,
                    recipientType: 'seller',
                    commissionType: 'sale'
                }
            };

            validateCalculateCommission(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('validateApproveCommission', () => {
        it('should validate both body and params', () => {
            mockRequest = {
                params: { id: uuidv4() },
                body: { autoSchedulePayout: true }
            };

            validateApproveCommission(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should reject invalid id in params', () => {
            mockRequest = {
                params: { id: 'not-a-uuid' },
                body: {}
            };

            validateApproveCommission(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });

    describe('validateSellerId', () => {
        it('should allow valid uuid', () => {
            mockRequest = { params: { sellerId: uuidv4() } };
            validateSellerId(mockRequest as Request, mockResponse as Response, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should reject non-uuid', () => {
            mockRequest = { params: { sellerId: '123' } };
            validateSellerId(mockRequest as Request, mockResponse as Response, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });
});
