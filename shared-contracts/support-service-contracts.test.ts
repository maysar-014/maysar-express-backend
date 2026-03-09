import {
  MessageAddedEventPayload,
  Support_SenderType,
  Support_TicketPriority,
  Support_TicketStatus,
  TicketResponseDto
} from './support-service-contracts';

describe('Support service contracts', () => {
  it('exposes expected enum values', () => {
    expect(Support_TicketStatus.OPEN).toBe('OPEN');
    expect(Support_TicketPriority.URGENT).toBe('URGENT');
    expect(Support_SenderType.SYSTEM).toBe('SYSTEM');
  });

  it('supports typed ticket and event payloads', () => {
    const ticket: TicketResponseDto = {
      id: 'ticket-1',
      userId: 'user-1',
      subject: 'Need help',
      description: 'Issue details',
      status: Support_TicketStatus.OPEN,
      priority: Support_TicketPriority.HIGH,
      category: 'billing',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
    const messageAdded: MessageAddedEventPayload = {
      messageId: 'msg-1',
      ticketId: ticket.id,
      senderId: 'agent-1',
      senderType: Support_SenderType.AGENT
    };

    expect(ticket.priority).toBe(Support_TicketPriority.HIGH);
    expect(messageAdded.senderType).toBe('AGENT');
  });
});
