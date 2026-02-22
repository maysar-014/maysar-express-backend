import { AddMessageUseCase } from '../add-message.use-case';
import { AddMessageDto } from '../../dto/message.dto';

describe('AddMessageUseCase', () => {
    let useCase: AddMessageUseCase;
    let mockTicketRepo: any;
    let mockMessageRepo: any;
    let mockAttachmentRepo: any;
    let mockEventBus: any;

    const mockTicket = { id: 'ticket-1', status: 'OPEN' };

    const validDto: AddMessageDto = {
        ticketId: 'ticket-1',
        senderId: 'user-1',
        senderType: 'USER',
        content: 'I still have the issue',
        isInternal: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = { findById: jest.fn().mockResolvedValue(mockTicket) };
        mockMessageRepo = { create: jest.fn().mockResolvedValue({ id: 'msg-1', ...validDto }) };
        mockAttachmentRepo = { update: jest.fn() };
        mockEventBus = { publish: jest.fn() };

        useCase = new AddMessageUseCase(mockTicketRepo, mockMessageRepo, mockAttachmentRepo, mockEventBus);
    });

    it('should add message successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockMessageRepo.create).toHaveBeenCalled();
    });

    it('should fail when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Ticket not found');
    });

    it('should fail with empty content', async () => {
        await expect(useCase.execute({ ...validDto, content: '' })).rejects.toThrow();
    });

    it('should handle message with attachments', async () => {
        const dtoWithAttachments = { ...validDto, attachments: ['att-1', 'att-2'] };

        await useCase.execute(dtoWithAttachments);

        expect(mockAttachmentRepo.update).toHaveBeenCalledTimes(2);
    });

    it('should publish MessageAdded event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith('MessageAdded', expect.any(Object));
    });

    it('should handle internal messages', async () => {
        await useCase.execute({ ...validDto, isInternal: true });

        expect(mockMessageRepo.create).toHaveBeenCalled();
    });

    it('should handle different sender types', async () => {
        const senderTypes = ['USER', 'AGENT', 'SYSTEM'];

        for (const senderType of senderTypes) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, senderType });
            expect(mockMessageRepo.create).toHaveBeenCalled();
        }
    });
});
