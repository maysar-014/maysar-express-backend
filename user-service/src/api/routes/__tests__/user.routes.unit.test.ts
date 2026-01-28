import { Request, Response } from 'express';

// Mock dependencies that are instantiated inside createUserRoutes       
jest.mock('@application/use-cases/create-user.use-case', () => ({        
  CreateUserUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn()
  }))
}));

jest.mock('@domain/services/user-validation.service', () => ({
  UserValidationService: jest.fn().mockImplementation(() => ({}))        
}));

jest.mock('@domain/policies/user-security.policy', () => ({
  UserSecurityPolicy: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@application/mappers/user-mapper', () => ({
  UserMapper: {
    toResponseDto: jest.fn((u: any) => ({ id: u?.id || 'u1', email: u?.email?.value || 'x' }))                                                      
  }
}));

import { createUserRoutes } from '../user.routes';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { UserAlreadyExistsError } from '@domain/errors/user.errors';     

function findRouteHandler(router: any, path: string, method: string) {   
  const layer = router.stack.find((l: any) => l.route && l.route.path === path);                                                                    
  if (!layer) throw new Error('route not found ' + path);
  const route = layer.route;
  const stackItem = route.stack.find((s: any) => s.method === method.toLowerCase());                                                                
  if (!stackItem) throw new Error('method not found ' + method);
  return stackItem.handle;
}

describe('User routes (unit)', () => {
  test('POST / create user - success', async () => {
    const CU = (CreateUserUseCase as any) as jest.Mock;
    const fakeExecute = jest.fn().mockResolvedValue({ id: 'u1', email: { value: 'a@b.com' } });
    CU.mockImplementation(() => ({ execute: fakeExecute }));

    const router = createUserRoutes();
    const postHandler = findRouteHandler(router, '/', 'POST');

    const req = { body: { email: 'a@b.com' } } as Partial<Request>;
    const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await postHandler(req, res, jest.fn());

    expect(fakeExecute).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test('POST / create user - conflict', async () => {
    const CU = (CreateUserUseCase as any) as jest.Mock;
    const fakeExecute = jest.fn().mockRejectedValue(new UserAlreadyExistsError('dup'));
    CU.mockImplementation(() => ({ execute: fakeExecute }));

    const router = createUserRoutes();
    const postHandler = findRouteHandler(router, '/', 'POST');

    const req = { body: { email: 'a@b.com' } } as Partial<Request>;
    const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await postHandler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalled();
  });

  test('GET /profile returns 401 when no x-user-id header', async () => {
    const router = createUserRoutes();
    const getHandler = findRouteHandler(router, '/profile', 'GET');      

    const req = { headers: {} } as Partial<Request>;
    const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await getHandler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
  });

  test('GET /:id returns 501 (not implemented)', async () => {
    const router = createUserRoutes();
    const getHandler = findRouteHandler(router, '/:id', 'GET');

    const req = { params: { id: 'u1' } } as Partial<Request>;
    const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await getHandler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalled();
  });
});
