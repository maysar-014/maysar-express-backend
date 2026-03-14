import type { Router } from 'express';
import { createCommunityRouter, createKnowledgeRouter } from './community.routes';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

const getRouteSignatures = (router: Router): string[] => {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

describe('community.routes', () => {
  it('creates knowledge router with expected endpoints', () => {
    const knowledgeController = {
      submitArticle: jest.fn(),
      listArticles: jest.fn(),
      getArticle: jest.fn(),
      submitReview: jest.fn(),
      publishArticle: jest.fn()
    };

    const router = createKnowledgeRouter(knowledgeController as any);
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /articles',
        'GET /articles',
        'GET /articles/:articleId',
        'POST /articles/:articleId/reviews',
        'POST /articles/:articleId/publish'
      ])
    );
  });

  it('creates community router with expected endpoints', () => {
    const communityController = {
      discoverContent: jest.fn(),
      proposeChallenge: jest.fn(),
      listChallenges: jest.fn(),
      submitSolution: jest.fn(),
      validateExpertise: jest.fn()
    };

    const router = createCommunityRouter(communityController as any);
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /discover',
        'POST /challenges',
        'GET /challenges',
        'POST /challenges/:challengeId/solutions',
        'POST /expertise/validate'
      ])
    );
  });
});
