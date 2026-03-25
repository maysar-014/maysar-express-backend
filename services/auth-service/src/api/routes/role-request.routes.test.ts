import express from 'express';
import request from 'supertest';
import { createRoleRequestRouter } from './role-request.routes';

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = {
      userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      roles: ['buyer']
    };
    next();
  }
}));

describe('role request routes', () => {
  it('creates a new role request', async () => {
    const prisma = {
      auth_RoleRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'ath_rreq_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          requestedRole: 'seller',
          status: 'PENDING',
          justification: 'I need seller access to manage my shop.',
          createdAt: new Date('2026-03-23T10:00:00.000Z')
        })
      }
    };

    const app = express();
    app.use(express.json());
    app.use(createRoleRequestRouter(prisma as any));

    const response = await request(app)
      .post('/role-requests')
      .send({ role: 'seller', justification: 'I need seller access to manage my shop.' });

    expect(response.status).toBe(201);
    expect(prisma.auth_RoleRequest.create).toHaveBeenCalled();
  });

  it('lists current user role requests', async () => {
    const prisma = {
      auth_RoleRequest: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ath_rreq_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            requestedRole: 'seller',
            status: 'PENDING',
            justification: 'I need seller access to manage my shop.',
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: null,
            createdAt: new Date('2026-03-23T10:00:00.000Z'),
            updatedAt: new Date('2026-03-23T10:00:00.000Z')
          }
        ])
      }
    };

    const app = express();
    app.use(express.json());
    app.use(createRoleRequestRouter(prisma as any));

    const response = await request(app).get('/role-requests');

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
  });
});
