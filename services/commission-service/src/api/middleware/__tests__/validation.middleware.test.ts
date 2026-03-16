import { Request, Response, NextFunction } from 'express';
import {
    validateCalculateCommission,
    validateApproveCommission,
    validateSellerId,
} from '../validation.middleware';
import { getModelPrefix, makeId } from '@shared/ids/id';

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
                    orderId: makeId(getModelPrefix('Order_Order')),
                    sellerId: makeId(getModelPrefix('User_User')),
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
                    sellerId: makeId(getModelPrefix('User_User')),
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
                params: { id: makeId(getModelPrefix('Commission')) },
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
            mockRequest = { params: { sellerId: makeId(getModelPrefix('User_User')) } };
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
