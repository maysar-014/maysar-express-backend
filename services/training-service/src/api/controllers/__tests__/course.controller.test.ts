import { CourseController } from '../course.controller';
import { Request, Response } from 'express';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockEnrollUseCase = { execute: jest.fn() } as any;

describe('CourseController', () => {
    let controller: CourseController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new CourseController(mockCreateUseCase, mockEnrollUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create course', async () => {
        req.body = { title: 'Test Course', instructorId: 'i1' };
        mockCreateUseCase.execute.mockResolvedValue({ id: 'c1' });
        await controller.create(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should enroll student', async () => {
        req.params = { id: 'c1' };
        req.body = { studentId: 's1' };
        await controller.enroll(req as Request, res as Response);
        expect(mockEnrollUseCase.execute).toHaveBeenCalledWith('c1', 's1');
    });
});
