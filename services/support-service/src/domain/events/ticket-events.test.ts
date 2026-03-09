import { SenderType, TicketPriority, TicketStatus } from '../types';
import {
  MessageAddedEvent,
  TicketAssignedEvent,
  TicketClosedEvent,
  TicketCreatedEvent,
  TicketResolvedEvent,
  TicketStatusChangedEvent
} from './ticket-events';

describe('ticket events', () => {
  it('creates ticket lifecycle events with timestamps', () => {
    const created = new TicketCreatedEvent('t-1', 'u-1', 'Payment delayed', TicketPriority.HIGH, 'PAYMENT');
    const assigned = new TicketAssignedEvent('t-1', 'a-1', 'system');
    const changed = new TicketStatusChangedEvent('t-1', TicketStatus.OPEN, TicketStatus.IN_PROGRESS, 'a-1');
    const resolved = new TicketResolvedEvent('t-1', 'a-1', 25, 'Issue resolved');
    const closed = new TicketClosedEvent('t-1', 'u-1', 'confirmed');
    const message = new MessageAddedEvent('t-1', 'm-1', 'u-1', SenderType.USER);

    expect(created.priority).toBe(TicketPriority.HIGH);
    expect(assigned.agentId).toBe('a-1');
    expect(changed.toStatus).toBe(TicketStatus.IN_PROGRESS);
    expect(resolved.resolutionTimeMinutes).toBe(25);
    expect(closed.reason).toBe('confirmed');
    expect(message.senderType).toBe(SenderType.USER);

    expect(created.occurredAt).toBeInstanceOf(Date);
    expect(message.occurredAt).toBeInstanceOf(Date);
  });
});
