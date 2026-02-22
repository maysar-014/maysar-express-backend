import { PreferenceController } from '../preference.controller';
import { Request, Response } from 'express';

const mockUpdateUseCase = { execute: jest.fn() } as any;
const mockGetUseCase = { execute: jest.fn() } as any;

describe('PreferenceController', () => {
    let controller: PreferenceController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PreferenceController(mockUpdateUseCase, mockGetUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should update preference', async () => {
        req.params = { id: 'p1' };
        req.body = { enabled: false };

        await controller.update(req as Request, res as Response);

        expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('p1', { enabled: false });
    });

    it('should get preferences', async () => {
        req.params = { userId: 'u1' };
        mockGetUseCase.execute.mockResolvedValue([{ id: 'p1' }]);

        await controller.get(req as Request, res as Response);

        expect(res.json).toHaveBeenCalled();
    });
});
