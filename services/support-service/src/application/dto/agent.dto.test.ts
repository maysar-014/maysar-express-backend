import type {
  AgentResponseDto,
  AgentStatsDto,
  CreateAgentDto,
  UpdateAgentDto
} from './agent.dto';

describe('agent DTO contracts', () => {
  it('supports create and update agent payloads', () => {
    const createDto: CreateAgentDto = {
      userId: 'user-1',
      specializations: ['billing'],
      maxConcurrentTickets: 8
    };
    const updateDto: UpdateAgentDto = {
      agentId: 'agent-1',
      isAvailable: true
    };

    expect(createDto.maxConcurrentTickets).toBe(8);
    expect(updateDto.agentId).toBe('agent-1');
  });

  it('supports agent response payloads with stats', () => {
    const stats: AgentStatsDto = {
      totalTicketsResolved: 120,
      averageResolutionTime: 45,
      rating: 4.7
    };
    const response: AgentResponseDto = {
      id: 'agent-1',
      userId: 'user-1',
      specializations: ['billing', 'technical'],
      maxConcurrentTickets: 10,
      currentTicketCount: 4,
      isAvailable: true,
      metrics: stats,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    };

    expect(response.metrics.rating).toBe(4.7);
    expect(response.currentTicketCount).toBe(4);
  });
});
