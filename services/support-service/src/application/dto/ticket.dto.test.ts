import { TicketPriority, TicketStatus } from '../../domain/types';
import type {
  AssignTicketDto,
  CloseTicketDto,
  CreateTicketDto,
  ListTicketsDto,
  PaginatedTicketListDto,
  ResolveTicketDto,
  TicketAttachmentDto,
  TicketDetailResponseDto,
  TicketResponseDto,
  UpdateTicketDto,
  UpdateTicketStatusDto
} from './ticket.dto';

describe('ticket DTO contracts', () => {
  it('supports create/update/assignment and status payloads', () => {
    const attachment: TicketAttachmentDto = {
      fileName: 'screenshot.png',
      fileUrl: 'https://cdn.example.com/screenshot.png',
      fileSize: 120_000,
      mimeType: 'image/png'
    };
    const createDto: CreateTicketDto = {
      userId: 'user-1',
      subject: 'Payment issue',
      description: 'Wallet was charged twice',
      category: 'billing',
      priority: TicketPriority.HIGH,
      attachments: [attachment]
    };
    const updateDto: UpdateTicketDto = { subject: 'Updated subject' };
    const assignDto: AssignTicketDto = { ticketId: 'ticket-1', agentId: 'agent-1', assignedBy: 'admin-1' };
    const statusDto: UpdateTicketStatusDto = {
      ticketId: 'ticket-1',
      newStatus: TicketStatus.IN_PROGRESS,
      updatedBy: 'agent-1'
    };
    const resolveDto: ResolveTicketDto = {
      ticketId: 'ticket-1',
      agentId: 'agent-1',
      resolution: 'Refund issued'
    };
    const closeDto: CloseTicketDto = {
      ticketId: 'ticket-1',
      closedBy: 'agent-1'
    };

    expect(createDto.attachments?.[0].mimeType).toBe('image/png');
    expect(updateDto.subject).toBe('Updated subject');
    expect(assignDto.assignedBy).toBe('admin-1');
    expect(statusDto.newStatus).toBe(TicketStatus.IN_PROGRESS);
    expect(resolveDto.resolution).toContain('Refund');
    expect(closeDto.closedBy).toBe('agent-1');
  });

  it('supports ticket response, details, and pagination payloads', () => {
    const ticket: TicketResponseDto = {
      id: 'ticket-1',
      userId: 'user-1',
      subject: 'Payment issue',
      description: 'Wallet was charged twice',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      category: 'billing',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z')
    };
    const detail: TicketDetailResponseDto = {
      ...ticket,
      messages: [
        {
          id: 'msg-1',
          ticketId: 'ticket-1',
          senderId: 'agent-1',
          senderType: 'AGENT',
          content: 'We are investigating',
          isInternal: false,
          createdAt: new Date('2026-03-01T01:00:00.000Z')
        }
      ],
      attachments: []
    };
    const listFilter: ListTicketsDto = {
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      page: 1,
      limit: 20
    };
    const paginated: PaginatedTicketListDto = {
      items: [ticket],
      total: 1,
      page: 1,
      limit: 20
    };

    expect(detail.messages).toHaveLength(1);
    expect(listFilter.status).toBe(TicketStatus.OPEN);
    expect(paginated.total).toBe(1);
  });
});
