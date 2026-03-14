import { Request, Response, NextFunction } from 'express';
import { CommunityController } from './community.controller';

const makeResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response);

describe('CommunityController', () => {
  const proposeChallengeUseCase = { execute: jest.fn() };
  const validateExpertiseUseCase = { execute: jest.fn() };
  const discoverContentUseCase = { execute: jest.fn() };

  const controller = new CommunityController(
    proposeChallengeUseCase as never,
    validateExpertiseUseCase as never,
    discoverContentUseCase as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 for proposeChallenge when user is missing', async () => {
    const req = { body: {} } as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.proposeChallenge(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('creates challenge and returns 201', async () => {
    proposeChallengeUseCase.execute.mockResolvedValue({ id: 'ch-1' });
    const req = {
      user: { id: 'u1' },
      body: {
        title: 'Challenge title',
        description: 'Challenge description',
        category: 'ops',
        successCriteria: ['x'],
        deadline: '2026-03-10T00:00:00.000Z'
      }
    } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.proposeChallenge(req, res, next);

    expect(proposeChallengeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        proposerId: 'u1',
        industryTags: [],
        constraints: [],
        deadline: new Date('2026-03-10T00:00:00.000Z')
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('maps proposeChallenge quota errors to 429', async () => {
    proposeChallengeUseCase.execute.mockRejectedValue(new Error('Quota exceeded for this action'));
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.proposeChallenge(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'Quota exceeded for this action' });
    expect(next).not.toHaveBeenCalled();
  });

  it('maps proposeChallenge validation-like errors to 400', async () => {
    proposeChallengeUseCase.execute.mockRejectedValue(new Error('Invalid challenge payload'));
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.proposeChallenge(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid challenge payload' });
  });

  it('forwards unknown proposeChallenge errors to next', async () => {
    const err = new Error('unexpected failure');
    proposeChallengeUseCase.execute.mockRejectedValue(err);
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.proposeChallenge(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('handles validateExpertise verified=false with 400', async () => {
    validateExpertiseUseCase.execute.mockResolvedValue({
      verified: false,
      missingRequirements: ['score']
    });
    const req = {
      user: { id: 'u2' },
      body: { expertiseArea: 'ops', targetLevel: 'EXPERT' }
    } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.validateExpertise(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      verified: false,
      missingRequirements: ['score']
    });
  });

  it('handles validateExpertise verified=true with 200', async () => {
    validateExpertiseUseCase.execute.mockResolvedValue({ verified: true, level: 'EXPERT' });
    const req = {
      user: { id: 'u2' },
      body: { expertiseArea: 'ops', targetLevel: 'EXPERT' }
    } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.validateExpertise(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ verified: true, level: 'EXPERT' });
  });

  it('forwards validateExpertise errors to next', async () => {
    const err = new Error('validation service down');
    validateExpertiseUseCase.execute.mockRejectedValue(err);
    const req = {
      user: { id: 'u2' },
      body: { expertiseArea: 'ops', targetLevel: 'EXPERT' }
    } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.validateExpertise(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('returns 401 for discoverContent when user is missing', async () => {
    const req = { query: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.discoverContent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('calls discover use case with parsed query options and returns 200', async () => {
    discoverContentUseCase.execute.mockResolvedValue({ items: [{ id: 'x' }] });
    const req = {
      user: { id: 'u3' },
      query: { sessionType: 'daily', maxResults: '5' }
    } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.discoverContent(req, res, next);

    expect(discoverContentUseCase.execute).toHaveBeenCalledWith({
      userId: 'u3',
      sessionType: 'daily',
      maxResults: 5
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns placeholder responses for listChallenges and submitSolution', async () => {
    const res1 = makeResponse();
    await controller.listChallenges(
      { query: { page: '2', limit: '10' } } as unknown as Request,
      res1,
      jest.fn() as NextFunction
    );
    expect(res1.status).toHaveBeenCalledWith(200);
    expect(res1.json).toHaveBeenCalledWith(
      expect.objectContaining({
        challenges: [],
        pagination: expect.objectContaining({ page: 2, limit: 10, total: 0 })
      })
    );

    const res2 = makeResponse();
    await controller.submitSolution(
      { user: { id: 'u9' }, params: { challengeId: 'c1' } } as unknown as Request,
      res2,
      jest.fn() as NextFunction
    );
    expect(res2.status).toHaveBeenCalledWith(201);
    expect(res2.json).toHaveBeenCalledWith({ message: 'Solution submitted' });
  });
});

