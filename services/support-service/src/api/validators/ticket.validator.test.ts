import { TicketPriority, TicketStatus } from '../../domain/types';
import {
  addMessageSchema,
  assignTicketSchema,
  closeTicketSchema,
  createTicketSchema,
  listTicketsSchema,
  resolveTicketSchema
} from './ticket.validator';

describe('ticket.validator', () => {
  it('parses valid create ticket payload', () => {
    const parsed = createTicketSchema.parse({
      subject: 'Order is delayed',
      description: 'My order has not moved for 3 days',
      category: 'delivery',
      priority: TicketPriority.HIGH
    });

    expect(parsed.priority).toBe(TicketPriority.HIGH);
  });

  it('parses message/assign/resolve/close payloads', () => {
    expect(addMessageSchema.parse({ content: 'Investigating now', authorId: 'usr_1' }).authorId).toBe('usr_1');
    expect(assignTicketSchema.parse({ agentId: '550e8400-e29b-41d4-a716-446655440000' }).agentId).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
    expect(resolveTicketSchema.parse({ resolution: 'Issue fixed permanently' }).resolution).toContain('fixed');
    expect(closeTicketSchema.parse({ reason: 'User confirmed resolution' }).reason).toContain('confirmed');
  });

  it('parses list filters and coerces pagination query params', () => {
    const parsed = listTicketsSchema.parse({
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      page: '2',
      limit: '25'
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
  });

  it('rejects invalid ticket payloads', () => {
    expect(() =>
      createTicketSchema.parse({
        subject: 'bad',
        description: 'short',
        category: 'delivery'
      })
    ).toThrow();
  });
});
