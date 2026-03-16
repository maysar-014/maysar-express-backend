import { PreferenceController } from '../preference.controller';
import { Request, Response } from 'express';

const mockUpdateUseCase = { execute: jest.fn() } as any;
const mockRepository = { findByUserId: jest.fn() } as any;

describe('PreferenceController', () => {
    let controller: PreferenceController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PreferenceController(mockUpdateUseCase, mockRepository);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should update preference', async () => {
        req.params = { userId: 'u1' };
        req.body = { channel: 'email', enabled: false };
        mockUpdateUseCase.execute.mockResolvedValue({ id: 'p1' });

        await controller.updatePreferences(req as Request, res as Response);

        expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('u1', 'email', { enabled: false });
    });

    it('should get preferences', async () => {
        req.params = { userId: 'u1' };
        mockRepository.findByUserId.mockResolvedValue([{ id: 'p1' }]);

        await controller.getPreferences(req as Request, res as Response);

        expect(res.json).toHaveBeenCalled();
    });
});
