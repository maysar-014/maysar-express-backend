import { SenderType } from '../../domain/types';
import type { AddMessageDto, MessageListDto, MessageResponseDto } from './message.dto';

describe('message DTO contracts', () => {
  it('supports add-message payload shape', () => {
    const dto: AddMessageDto = {
      ticketId: 'ticket-1',
      senderId: 'agent-1',
      senderType: SenderType.AGENT,
      content: 'We are investigating your issue.',
      isInternal: true,
      attachments: ['att-1']
    };

    expect(dto.senderType).toBe(SenderType.AGENT);
    expect(dto.attachments).toEqual(['att-1']);
  });

  it('supports message response and list payloads', () => {
    const message: MessageResponseDto = {
      id: 'msg-1',
      ticketId: 'ticket-1',
      senderId: 'user-1',
      senderType: SenderType.USER,
      content: 'Need help with order',
      isInternal: false,
      createdAt: new Date('2026-02-01T10:00:00.000Z')
    };
    const list: MessageListDto = {
      items: [message],
      total: 1
    };

    expect(list.total).toBe(1);
    expect(list.items[0].senderType).toBe(SenderType.USER);
  });
});
