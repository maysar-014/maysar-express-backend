import { Container } from 'inversify';
import { container, TYPES } from './container';

describe('session infrastructure container', () => {
  afterEach(() => {
    if (container.isBound(TYPES.EventBus)) {
      container.unbind(TYPES.EventBus);
    }
  });

  it('exports a DI container and symbol tokens', () => {
    expect(container).toBeInstanceOf(Container);
    expect(TYPES.PrismaClient).toBe(Symbol.for('PrismaClient'));
    expect(TYPES.EventBus).toBe(Symbol.for('EventBus'));
  });

  it('supports runtime bindings for declared symbols', () => {
    const eventBus = { bus: 'event-bus' };
    container.bind<typeof eventBus>(TYPES.EventBus).toConstantValue(eventBus);

    expect(container.get<typeof eventBus>(TYPES.EventBus)).toBe(eventBus);
  });
});
