import { Request, Response } from 'express';
import { DiscussionsController } from '../discussions.controller';
import { DiscussionThread, ExpertiseLevel } from '../../../domain/entities/discussion-thread.entity';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockAnswerUseCase = { execute: jest.fn() } as any;

describe('DiscussionsController', () => {
    let controller: DiscussionsController;
    let req: Partial<Request> & { user?: { userId: string; email: string; roles: string[]; permissions: string[] } };
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new DiscussionsController(mockCreateUseCase, mockAnswerUseCase);
        req = {
            body: {},
            params: {},
            query: {},
            headers: {},
            user: {
                userId: 'u1',
                email: 'u1@example.com',
                roles: ['buyer'],
                permissions: []
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create discussion', async () => {
        req.body = {
            topic: 'Test topic',
            content: 'This is a detailed discussion content that is long enough to pass validation.',
            category: 'GENERAL',
            expertiseLevel: ExpertiseLevel.BEGINNER,
            businessContext: {
                industry: ['agriculture'],
                businessStage: 'startup',
                tags: ['farming']
            }
        };

        mockCreateUseCase.execute.mockResolvedValue({
            thread: DiscussionThread.create({
                id: 't1',
                authorId: 'u1',
                topic: 'Test topic',
                content: 'This is a detailed discussion content that is long enough to pass validation.',
                category: 'GENERAL',
                expertiseLevel: ExpertiseLevel.BEGINNER,
                businessContext: {
                    industry: ['agriculture'],
                    businessStage: 'startup',
                    tags: ['farming']
                }
            }),
            matchedExperts: [],
            quotaRemaining: 4
        });

        await controller.createDiscussion(req as Request, res as Response, jest.fn());

        expect(res.status).toHaveBeenCalledWith(201);
        expect(mockCreateUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
            authorId: 'u1',
            topic: 'Test topic',
            category: 'GENERAL'
        }));
    });

    it('should list discussions', async () => {
        await controller.listDiscussions(req as Request, res as Response, jest.fn());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true
        }));
    });
});
