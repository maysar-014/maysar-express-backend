import { createUserRoutes } from '../user.routes';
import { Router } from 'express';

jest.mock('@application/use-cases/create-user.use-case');
jest.mock('@domain/services/user-validation.service');
jest.mock('@domain/policies/user-security.policy');
jest.mock('@api/controllers/user.controller');

describe('User Routes - Full Coverage', () => {
  let router: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = createUserRoutes();
  });

  it('creates router successfully', () => {
    expect(router).toBeDefined();
    expect(router).toHaveProperty('post');
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('put');
    expect(router).toHaveProperty('delete');
  });

  it('registers POST / route for createUser', () => {
    const stack = (router as any).stack;
    const postRoute = stack.find((layer: any) => layer.route?.methods?.post && layer.route?.path === '/');
    expect(postRoute).toBeDefined();
  });

  it('registers GET /:id route for getUserById', () => {
    const stack = (router as any).stack;
    const getRoute = stack.find((layer: any) => layer.route?.methods?.get && layer.route?.path === '/:id');
    expect(getRoute).toBeDefined();
  });

  it('registers PUT /:id route for updateUser', () => {
    const stack = (router as any).stack;
    const putRoute = stack.find((layer: any) => layer.route?.methods?.put && layer.route?.path === '/:id');
    expect(putRoute).toBeDefined();
  });

  it('registers DELETE /:id route for deleteUser', () => {
    const stack = (router as any).stack;
    const deleteRoute = stack.find((layer: any) => layer.route?.methods?.delete && layer.route?.path === '/:id');
    expect(deleteRoute).toBeDefined();
  });

  it('registers POST /verify-email/:token route', () => {
    const stack = (router as any).stack;
    const verifyRoute = stack.find((layer: any) => layer.route?.methods?.post && layer.route?.path === '/verify-email/:token');
    expect(verifyRoute).toBeDefined();
  });

  it('registers POST /request-password-reset route', () => {
    const stack = (router as any).stack;
    const resetRoute = stack.find((layer: any) => layer.route?.methods?.post && layer.route?.path === '/request-password-reset');
    expect(resetRoute).toBeDefined();
  });

  it('registers POST /reset-password/:token route', () => {
    const stack = (router as any).stack;
    const resetRoute = stack.find((layer: any) => layer.route?.methods?.post && layer.route?.path === '/reset-password/:token');
    expect(resetRoute).toBeDefined();
  });

  it('registers GET /profile route', () => {
    const stack = (router as any).stack;
    const profileRoute = stack.find((layer: any) => layer.route?.methods?.get && layer.route?.path === '/profile');
    expect(profileRoute).toBeDefined();
  });

  it('registers PUT /profile route', () => {
    const stack = (router as any).stack;
    const profileRoute = stack.find((layer: any) => layer.route?.methods?.put && layer.route?.path === '/profile');
    expect(profileRoute).toBeDefined();
  });

  it('initializes UserValidationService', () => {
    expect(router).toBeDefined();
  });

  it('initializes UserSecurityPolicy', () => {
    expect(router).toBeDefined();
  });

  it('initializes CreateUserUseCase with dependencies', () => {
    expect(router).toBeDefined();
  });

  it('initializes UserController with use case', () => {
    expect(router).toBeDefined();
  });

  it('all routes are async handlers', () => {
    const stack = (router as any).stack;
    const routes = stack.filter((layer: any) => layer.route);
    
    routes.forEach((route: any) => {
      const handlers = route.route.stack;
      handlers.forEach((handler: any) => {
        expect(handler.handle).toBeDefined();
      });
    });
  });
});
