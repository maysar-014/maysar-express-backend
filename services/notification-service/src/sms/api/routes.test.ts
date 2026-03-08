const sendMock = jest.fn();
const getStatusMock = jest.fn();
const retryFailedMock = jest.fn();
const retryMessageMock = jest.fn();
const getStatisticsMock = jest.fn();
const webhookMock = jest.fn();
const containerGetMock = jest.fn().mockReturnValue({
  send: sendMock,
  getStatus: getStatusMock,
  retryFailed: retryFailedMock,
  retryMessage: retryMessageMock,
  getStatistics: getStatisticsMock,
  webhookAfricastalking: webhookMock
});

jest.mock('../infrastructure/container', () => ({
  container: {
    get: containerGetMock
  }
}));

import type { Router } from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { TYPES } from '../infrastructure/types';
import { createSmsRouter } from './routes';

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

describe('routes modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds SMS API routes with all expected endpoints', () => {
    const router = createSmsRouter();
    const signatures = getRouteSignatures(router);

    expect(containerGetMock).toHaveBeenCalledWith(TYPES.SmsController);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /send',
        'GET /status/:messageId',
        'POST /retry/failed',
        'POST /retry/:messageId',
        'GET /statistics',
        'POST /webhook/africastalking'
      ])
    );
  });

  it('verifies order-service routes definition file is present and documented', () => {
    const filePath = path.resolve(__dirname, '../../../../order-service/src/api/routes.ts');
    const contents = readFileSync(filePath, 'utf8');

    expect(contents).toContain('API Route definitions');
    expect(contents).toContain('order routes');
  });
});
