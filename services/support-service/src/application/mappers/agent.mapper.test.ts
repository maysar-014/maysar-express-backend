import { SupportAgent } from '../../domain/entities/support-agent.entity';
import { AgentMapper } from './agent.mapper';

const createAgent = (): SupportAgent =>
  new SupportAgent({
    id: 'agent-1',
    userId: 'user-1',
    specializations: ['billing', 'technical'],
    maxConcurrentTickets: 8,
    currentTicketCount: 2,
    isAvailable: true,
    metrics: {
      totalTicketsResolved: 120,
      averageResolutionTime: 42,
      rating: 4.8
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z')
  });

describe('AgentMapper', () => {
  it('maps support-agent domain entity to response dto', () => {
    const dto = AgentMapper.toResponseDto(createAgent());

    expect(dto).toEqual({
      id: 'agent-1',
      userId: 'user-1',
      specializations: ['billing', 'technical'],
      maxConcurrentTickets: 8,
      currentTicketCount: 2,
      isAvailable: true,
      metrics: {
        totalTicketsResolved: 120,
        averageResolutionTime: 42,
        rating: 4.8
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    });
  });

  it('maps persistence object to support-agent domain entity', () => {
    const domain = AgentMapper.toDomain({
      id: 'agent-2',
      userId: 'user-2',
      specializations: ['returns'],
      maxConcurrentTickets: 5,
      currentTicketCount: 1,
      isAvailable: false,
      totalTicketsResolved: 20,
      averageResolutionTime: 30,
      rating: 4.1,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T01:00:00.000Z')
    });

    expect(domain).toBeInstanceOf(SupportAgent);
    expect(domain.userId).toBe('user-2');
    expect(domain.metrics.totalTicketsResolved).toBe(20);
  });
});
