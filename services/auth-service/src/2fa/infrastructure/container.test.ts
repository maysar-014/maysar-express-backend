import { Container } from 'inversify';
import { container, TYPES } from './container';

describe('2fa infrastructure container', () => {
  afterEach(() => {
    if (container.isBound(TYPES.PrismaClient)) {
      container.unbind(TYPES.PrismaClient);
    }
  });

  it('exports a DI container and symbol tokens', () => {
    expect(container).toBeInstanceOf(Container);
    expect(TYPES.PrismaClient).toBe(Symbol.for('PrismaClient'));
    expect(TYPES.EventBus).toBe(Symbol.for('EventBus'));
  });

  it('supports runtime bindings for declared symbols', () => {
    const prismaClient = { service: 'prisma-client' };
    container.bind<typeof prismaClient>(TYPES.PrismaClient).toConstantValue(prismaClient);

    expect(container.get<typeof prismaClient>(TYPES.PrismaClient)).toBe(prismaClient);
  });
});
