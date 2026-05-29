import express from 'express';
import request from 'supertest';

const mockServiceAuth = jest.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

jest.mock('../middleware/authentication.middleware', () => ({
  AuthenticationMiddlewareFactory: {
    createServiceAuth: () => mockServiceAuth
  }
}));

import { createMaintenanceRoutes } from './maintenance.routes';

const createPrismaMock = () => ({
  session: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  auth_PasswordResetToken: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  auth_EmailVerificationToken: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  sharedOutboxEvent: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  }
});

describe('auth maintenance routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes auth cleanup report endpoints', async () => {
    const prisma = createPrismaMock();
    prisma.session.count.mockResolvedValueOnce(3);
    prisma.auth_PasswordResetToken.count.mockResolvedValueOnce(2);
    prisma.auth_EmailVerificationToken.count.mockResolvedValueOnce(1);
    prisma.sharedOutboxEvent.count.mockResolvedValueOnce(4).mockResolvedValueOnce(5);

    const app = express();
    app.use(express.json());
    app.use('/api/auth/maintenance', createMaintenanceRoutes(prisma as never));

    const reportRes = await request(app).post('/api/auth/maintenance/cleanup/auth/report').send({});
    const outboxReportRes = await request(app).post('/api/auth/maintenance/cleanup/outbox/report').send({});

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.counts).toEqual({
      sessions: 3,
      passwordResetTokens: 2,
      emailVerificationTokens: 1
    });
    expect(outboxReportRes.status).toBe(200);
    expect(outboxReportRes.body.counts).toEqual({
      processed: 4,
      failed: 5
    });
    expect(mockServiceAuth).toHaveBeenCalled();
  });

  it('cleans auth and outbox records in dry-run mode', async () => {
    const prisma = createPrismaMock();
    prisma.session.findMany
      .mockResolvedValueOnce([{ id: 's1' }, { id: 's2' }])
      .mockResolvedValueOnce([]);
    prisma.auth_PasswordResetToken.findMany
      .mockResolvedValueOnce([{ id: 'p1' }])
      .mockResolvedValueOnce([]);
    prisma.auth_EmailVerificationToken.findMany
      .mockResolvedValueOnce([{ id: 'e1' }])
      .mockResolvedValueOnce([]);
    prisma.sharedOutboxEvent.findMany
      .mockResolvedValueOnce([{ id: 'o1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'o2' }])
      .mockResolvedValueOnce([]);
    prisma.sharedOutboxEvent.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const app = express();
    app.use(express.json());
    app.use('/api/auth/maintenance', createMaintenanceRoutes(prisma as never));

    const authRes = await request(app).post('/api/auth/maintenance/cleanup/auth').send({ dryRun: true });
    const outboxRes = await request(app).post('/api/auth/maintenance/cleanup/outbox').send({ dryRun: true });

    expect(authRes.status).toBe(200);
    expect(authRes.body.results.sessions.deleted).toBe(2);
    expect(authRes.body.results.passwordResetTokens.deleted).toBe(1);
    expect(authRes.body.results.emailVerificationTokens.deleted).toBe(1);
    expect(outboxRes.status).toBe(200);
    expect(outboxRes.body.results.processed.deleted).toBe(1);
    expect(outboxRes.body.results.failed.deleted).toBe(1);
  });
});
