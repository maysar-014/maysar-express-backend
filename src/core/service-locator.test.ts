import { ServiceLocator } from './service-locator';

describe('ServiceLocator', () => {
  beforeEach(() => {
    ServiceLocator.reset();
  });

  afterEach(() => {
    ServiceLocator.reset();
    jest.restoreAllMocks();
  });

  it('registers and retrieves a service', () => {
    const logger = { info: jest.fn() };
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    ServiceLocator.register('logger', logger);

    expect(logSpy).toHaveBeenCalledWith('[ServiceLocator] Registered service: logger');
    expect(ServiceLocator.get<typeof logger>('logger')).toBe(logger);
  });

  it('throws when requesting a missing service', () => {
    expect(() => ServiceLocator.get('missing')).toThrow(
      'Service missing not found in Service Locator'
    );
  });

  it('reset clears registered services', () => {
    ServiceLocator.register('service', { value: 1 });
    ServiceLocator.reset();

    expect(() => ServiceLocator.get('service')).toThrow(
      'Service service not found in Service Locator'
    );
  });
});
