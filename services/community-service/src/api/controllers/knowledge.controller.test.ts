import { Request, Response } from 'express';
import { KnowledgeController } from './knowledge.controller';

const makeResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response);

describe('KnowledgeController', () => {
  const submitArticleUseCase = { execute: jest.fn() };
  const controller = new KnowledgeController(submitArticleUseCase as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 for submitArticle when user is missing', async () => {
    const req = { body: {} } as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.submitArticle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('submits article and returns expected response shape', async () => {
    submitArticleUseCase.execute.mockResolvedValue({
      article: { id: 'a1' },
      requiresPeerReview: true,
      quotaRemaining: 2
    });
    const req = {
      user: { id: 'u1' },
      body: {
        title: 'How to optimize fulfillment',
        summary: 'Useful summary',
        sections: [{ heading: 'h', content: 'c' }],
        category: 'ops',
        expertiseLevel: 'EXPERT'
      }
    } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.submitArticle(req, res, next);

    expect(submitArticleUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'u1',
        industryTags: []
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      article: { id: 'a1' },
      requiresPeerReview: true,
      quotaRemaining: 2
    });
  });

  it('maps insufficient reputation error to 403', async () => {
    submitArticleUseCase.execute.mockRejectedValue(new Error('Insufficient reputation for article submissions'));
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.submitArticle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Insufficient reputation for article submissions'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('maps quota exceeded error to 429', async () => {
    submitArticleUseCase.execute.mockRejectedValue(new Error('Quota exceeded for ARTICLE'));
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.submitArticle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'Quota exceeded for ARTICLE' });
  });

  it('maps invalid payload and duplicate-like errors to 400', async () => {
    submitArticleUseCase.execute.mockRejectedValue(new Error('Invalid sections payload'));
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    await controller.submitArticle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    submitArticleUseCase.execute.mockRejectedValue(new Error('Title already exists'));
    const res2 = makeResponse();
    await controller.submitArticle(req, res2, next);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('forwards unknown submitArticle errors to next', async () => {
    const err = new Error('unexpected downstream issue');
    submitArticleUseCase.execute.mockRejectedValue(err);
    const req = { user: { id: 'u1' }, body: {} } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.submitArticle(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('returns placeholder listArticles payload with parsed pagination', async () => {
    const req = { query: { page: '3', limit: '15' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();

    await controller.listArticles(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [],
        pagination: {
          page: 3,
          limit: 15,
          total: 0
        }
      })
    );
  });

  it('returns placeholder getArticle response', async () => {
    const req = { params: { articleId: 'a-1' } } as unknown as Request;
    const res = makeResponse();

    await controller.getArticle(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ article: null });
  });

  it('returns placeholder submitReview response', async () => {
    const req = {
      user: { id: 'u2' },
      params: { articleId: 'a-2' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.submitReview(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Review submitted',
      data: {
        articleId: 'a-2',
        reviewerId: 'u2'
      }
    });
  });

  it('returns placeholder publishArticle response', async () => {
    const req = {
      user: { id: 'u3' },
      params: { articleId: 'a-3' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.publishArticle(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Article published',
      data: {
        articleId: 'a-3',
        publishedBy: 'u3'
      }
    });
  });
});

