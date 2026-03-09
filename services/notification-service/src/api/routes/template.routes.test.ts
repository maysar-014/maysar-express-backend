import type { Router } from 'express';
import { createTemplateRoutes } from './template.routes';

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

describe('createTemplateRoutes', () => {
  it('registers template CRUD and render endpoints', () => {
    const controller = {
      createTemplate: jest.fn(),
      getTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      renderTemplate: jest.fn()
    };

    const signatures = getRouteSignatures(createTemplateRoutes(controller as never));

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /',
        'GET /:id',
        'PUT /:id',
        'DELETE /:id',
        'POST /:id/render'
      ])
    );
  });
});
