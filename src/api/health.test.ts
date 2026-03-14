import { healthRouter } from './health';
import { moduleRegistry } from '../core/module-registry';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: (req: any, res: any) => any }>;
  };
}

const getRouteHandler = (path: string, method: string) => {
  const layers = (healthRouter as unknown as { stack: Layer[] }).stack;
  const layer = layers.find(
    item => item.route?.path === path && item.route?.methods?.[method.toLowerCase()]
  );
  if (!layer?.route?.stack?.[0]) {
    throw new Error(`Route ${method} ${path} not found`);
  }
  return layer.route.stack[0].handle;
};

describe('health router', () => {
  beforeEach(() => {
    (moduleRegistry as any).modules = [];
  });

  it('returns health payload for GET /', async () => {
    (moduleRegistry as any).modules = [{ name: 'catalog' }, { name: 'order' }];

    const uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(123);
    const memorySpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 1,
      heapTotal: 2,
      heapUsed: 3,
      external: 4,
      arrayBuffers: 5
    } as NodeJS.MemoryUsage);

    const handler = getRouteHandler('/', 'GET');
    const res = { json: jest.fn() };

    await handler({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'UP',
        uptime: 123,
        memory: expect.objectContaining({ rss: 1 }),
        modules: ['catalog', 'order'],
        timestamp: expect.any(String)
      })
    );

    uptimeSpy.mockRestore();
    memorySpy.mockRestore();
  });

  it('returns OK for GET /liveness', () => {
    const handler = getRouteHandler('/liveness', 'GET');
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    handler({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });
});
