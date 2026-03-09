import { createAgentSchema, updateAgentSchema } from './agent.validator';

describe('agent.validator', () => {
  it('accepts valid create-agent payloads', () => {
    const parsed = createAgentSchema.parse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      specializations: ['billing', 'fulfillment'],
      maxConcurrentTickets: 20
    });

    expect(parsed.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(parsed.maxConcurrentTickets).toBe(20);
  });

  it('rejects invalid create-agent payloads', () => {
    expect(() =>
      createAgentSchema.parse({
        userId: 'not-a-uuid',
        maxConcurrentTickets: 0
      })
    ).toThrow();
  });

  it('accepts partial update-agent payloads with optional fields', () => {
    const parsed = updateAgentSchema.parse({
      isAvailable: true
    });

    expect(parsed.isAvailable).toBe(true);
  });
});
