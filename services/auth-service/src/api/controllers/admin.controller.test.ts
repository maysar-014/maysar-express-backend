import type { Request, Response } from 'express';

const mockAdminService = {
  getUserById: jest.fn(),
  updateUserStatus: jest.fn(),
  searchUsers: jest.fn()
};

const mockLoggerError = jest.fn();

jest.mock('../../application/services/admin.service', () => ({
  adminService: mockAdminService
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    error: mockLoggerError,
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { AdminController } from './admin.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController();
  });

  it('returns user payload from admin service', async () => {
    const req = {
      params: { userId: 'u1' }
    } as unknown as Request;
    const res = createResponse();

    mockAdminService.getUserById.mockResolvedValue({ userId: 'u1', role: 'seller' });

    await controller.getUser(req, res);

    expect(mockAdminService.getUserById).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ userId: 'u1' })
      })
    );
  });

  it('updates user status and emits success message', async () => {
    const req = {
      params: { userId: 'u2' },
      body: { status: 'suspended', reason: 'policy' }
    } as unknown as Request;
    const res = createResponse();

    mockAdminService.updateUserStatus.mockResolvedValue({ userId: 'u2', status: 'suspended' });

    await controller.updateUserStatus(req, res);

    expect(mockAdminService.updateUserStatus).toHaveBeenCalledWith('u2', 'suspended', 'policy');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'User status updated to suspended'
      })
    );
  });

  it('parses search pagination and handles failures with standard error shape', async () => {
    const req = {
      query: { query: 'john', limit: '15', offset: '5' }
    } as unknown as Request;
    const res = createResponse();

    mockAdminService.searchUsers.mockRejectedValue(new Error('search failure'));
    await controller.searchUsers(req, res);

    expect(mockAdminService.searchUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'john',
        limit: 15,
        offset: 5
      })
    );
    expect(mockLoggerError).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ADMIN_USER_SEARCH_FAILED' })
      })
    );
  });
});
