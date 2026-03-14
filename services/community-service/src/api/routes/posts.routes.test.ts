import type { Router } from 'express';
import { postsRoutes } from './posts.routes';

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

describe('posts.routes', () => {
  it('registers all post endpoints', () => {
    const signatures = getRouteSignatures(postsRoutes);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /',
        'GET /published',
        'GET /search',
        'GET /trending',
        'GET /:postId',
        'GET /:postId/related',
        'GET /authors/:authorId',
        'GET /users/:userId/feed'
      ])
    );
  });
});
