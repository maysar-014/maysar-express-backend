describe('authService bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.PORT;
  });

  it('wires dependencies, registers routes/handlers, and starts listening', async () => {
    const useMock = jest.fn();
    const postMock = jest.fn();
    const listenMock = jest.fn((_: any, cb: () => void) => cb());
    const app = {
      use: useMock,
      post: postMock,
      listen: listenMock
    };

    const expressFactory = jest.fn(() => app);
    const jsonMiddleware = jest.fn(() => 'json-middleware');
    (expressFactory as any).json = jsonMiddleware;

    const prismaCtor = jest.fn(() => ({ marker: 'prisma' }));
    const prismaUserRepoCtor = jest.fn(() => ({ marker: 'repo' }));
    const registerUseCaseCtor = jest.fn(() => ({ marker: 'register-use-case' }));
    const authUseCaseCtor = jest.fn(() => ({ marker: 'auth-use-case' }));
    const authControllerCtor = jest.fn(() => ({
      register: jest.fn()
    }));
    const registerHandlersMock = jest.fn();
    const authHandlersCtor = jest.fn(() => ({
      registerHandlers: registerHandlersMock
    }));

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PORT = '4567';

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));
    jest.doMock('@prisma/client', () => ({
      PrismaClient: prismaCtor
    }));
    jest.doMock('./infrastructure/repositories/prisma-user.repository', () => ({
      PrismaUserRepository: prismaUserRepoCtor
    }));
    jest.doMock('./application/use-cases/register-user.use-case', () => ({
      RegisterUserUseCase: registerUseCaseCtor
    }));
    jest.doMock('./application/use-cases/authenticate-user.use-case', () => ({
      AuthenticateUserUseCase: authUseCaseCtor
    }));
    jest.doMock('./api/controllers/auth.controller', () => ({
      AuthController: authControllerCtor
    }));
    jest.doMock('./infrastructure/events/auth.event-handlers', () => ({
      AuthEventHandlers: authHandlersCtor
    }));

    const module = await import('./authService');
    expect(module.default).toBe(app);

    expect(expressFactory).toHaveBeenCalledTimes(1);
    expect(jsonMiddleware).toHaveBeenCalledTimes(1);
    expect(useMock).toHaveBeenCalledWith('json-middleware');
    expect(prismaCtor).toHaveBeenCalledTimes(1);
    expect(prismaUserRepoCtor).toHaveBeenCalledTimes(1);
    expect(registerUseCaseCtor).toHaveBeenCalledTimes(1);
    expect(authUseCaseCtor).toHaveBeenCalledTimes(1);
    expect(authControllerCtor).toHaveBeenCalledTimes(1);
    expect(authHandlersCtor).toHaveBeenCalledTimes(1);
    expect(registerHandlersMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/api/auth/register', expect.any(Function));
    expect(listenMock).toHaveBeenCalledWith('4567', expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Auth Module running on port 4567');

    logSpy.mockRestore();
  });
});
