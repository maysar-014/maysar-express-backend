import { Request, Response } from 'express';
import { UserController } from '../user.controller';

const createResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('UserController contract-test behavior', () => {
  let controller: UserController;
  let mockGetUserUseCase: { execute: jest.Mock };
  let mockUpdateUserUseCase: { execute: jest.Mock };
  let mockChangeRoleUseCase: { execute: jest.Mock };

  beforeEach(() => {
    mockGetUserUseCase = { execute: jest.fn() };
    mockUpdateUserUseCase = { execute: jest.fn() };
    mockChangeRoleUseCase = { execute: jest.fn() };

    controller = new UserController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      mockChangeRoleUseCase as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      mockGetUserUseCase as any,
      mockUpdateUserUseCase as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      {} as any,
      {} as any
    );
  });

  it('returns the current user for empty contract-test update requests', async () => {
    const req = {
      params: { id: 'user-1' },
      body: {},
      headers: {
        'x-contract-test': '1',
        'x-user-id': 'admin-1',
        'x-user-roles': 'admin'
      }
    } as unknown as Request;
    const res = createResponse();

    mockGetUserUseCase.execute.mockResolvedValue({
      success: true,
      user: { id: 'user-1', role: 'seller' },
      message: 'ok'
    });

    await controller.updateUser(req, res);

    expect(mockUpdateUserUseCase.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rotates the default contract-test role away from the current role', async () => {
    const req = {
      params: { id: 'user-1' },
      body: {},
      headers: {
        'x-contract-test': '1',
        'x-user-id': 'admin-1',
        'x-user-roles': 'admin'
      }
    } as unknown as Request;
    const res = createResponse();

    mockGetUserUseCase.execute.mockResolvedValue({
      success: true,
      user: { id: 'user-1', role: 'seller' },
      message: 'ok'
    });
    mockChangeRoleUseCase.execute.mockResolvedValue({
      success: true,
      oldRole: 'seller',
      newRole: 'buyer',
      message: 'Role changed successfully'
    });

    await controller.changeRole(req, res);

    expect(mockChangeRoleUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        newRole: 'buyer',
        changedBy: 'admin-1'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
