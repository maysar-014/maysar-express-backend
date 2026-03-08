import { EventSchemaRegistry } from './base';

describe('EventSchemaRegistry', () => {
  it('registers and retrieves schemas by event type and version', () => {
    const registry = new EventSchemaRegistry();
    const schema = {
      eventType: 'OrderCreated',
      version: 'v1',
      validate: jest.fn().mockReturnValue({ valid: true })
    };

    registry.register(schema);

    expect(registry.getSchema('OrderCreated')).toBe(schema);
    expect(registry.getSchema('OrderCreated', 'v1')).toBe(schema);
    expect(registry.getSchema('OrderCreated', 'v2')).toBeUndefined();
  });

  it('returns valid=true when no schema exists (opt-in validation)', () => {
    const registry = new EventSchemaRegistry();

    const result = registry.validate('UnknownEvent', { any: 'payload' });

    expect(result).toEqual({ valid: true });
  });

  it('delegates validation to registered schema when present', () => {
    const registry = new EventSchemaRegistry();
    const validate = jest.fn().mockReturnValue({ valid: false, errors: ['missing orderId'] });
    registry.register({
      eventType: 'OrderCreated',
      version: 'v2',
      validate
    });

    const result = registry.validate('OrderCreated', { orderId: '' }, 'v2');

    expect(validate).toHaveBeenCalledWith({ orderId: '' });
    expect(result).toEqual({ valid: false, errors: ['missing orderId'] });
  });
});
