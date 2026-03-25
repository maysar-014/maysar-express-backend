import { ReferralController } from './referral.controller';
import { Request, Response } from 'express';

const mockGenerateUseCase = { execute: jest.fn() } as any;
const mockGetUseCase = { execute: jest.fn() } as any;
const mockTrackUseCase = { execute: jest.fn() } as any;

describe('ReferralController', () => {
    let controller: ReferralController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ReferralController(mockGenerateUseCase, mockGetUseCase, mockTrackUseCase);
        req = { body: {}, params: {}, query: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('returns the enabler referral link and tracking data', async () => {
        req.params = { enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        req.query = { includeQR: 'false' } as any;
        mockGetUseCase.execute.mockResolvedValue({
            enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            code: 'ENB-Q69G5F',
            shortCode: 'EQ69G5F',
            shareUrl: 'https://maysar.co.tz/?enablerCode=ENB-Q69G5F',
            shortUrl: 'https://maysar.co.tz/?enablerCode=EQ69G5F',
            landingPath: '/',
            generatedAt: '2026-03-23T10:00:00.000Z',
            updatedAt: '2026-03-23T10:00:00.000Z',
            tracking: { clicks: 0, signUps: 0, checkouts: 0, conversions: 0, ordersAttributed: 0, revenueAttributed: 0, commissionEarned: 0, conversionRate: 0 }
        });

        await controller.getReferralLink(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.not.objectContaining({
                    qrCode: expect.any(String)
                })
            })
        );
    });

    it('generates a referral link with optional campaign data', async () => {
        req.params = { enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        req.body = { includeQR: false, landingPath: '/discover', campaignName: 'Ramadan Promo' };
        mockGenerateUseCase.execute.mockResolvedValue({
            enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            code: 'ENB-Q69G5F',
            shortCode: 'EQ69G5F',
            shareUrl: 'https://maysar.co.tz/discover?enablerCode=ENB-Q69G5F',
            shortUrl: 'https://maysar.co.tz/discover?enablerCode=EQ69G5F',
            landingPath: '/discover',
            campaignName: 'Ramadan Promo',
            generatedAt: '2026-03-23T10:00:00.000Z',
            updatedAt: '2026-03-23T10:00:00.000Z',
            tracking: { clicks: 0, signUps: 0, checkouts: 0, conversions: 0, ordersAttributed: 0, revenueAttributed: 0, commissionEarned: 0, conversionRate: 0 }
        });

        await controller.generateReferralLink(req as Request, res as Response);

        expect(mockGenerateUseCase.execute).toHaveBeenCalledWith(
            'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            req.body
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
