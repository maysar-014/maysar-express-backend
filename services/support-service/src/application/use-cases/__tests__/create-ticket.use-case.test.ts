import { CreateTicketUseCase } from '../create-ticket.use-case';
import { CreateTicketDto } from '../../dto/ticket.dto';
import { TicketPriority, TicketStatus } from '../../../domain/types';

describe('CreateTicketUseCase', () => {
    let useCase: CreateTicketUseCase;
    let mockTicketRepo: any;
    let mockHistoryRepo: any;
    let mockAttachmentRepo: any;
    let mockEventBus: any;

    const validDto: CreateTicketDto = {
        userId: 'user-1',
        subject: 'Login Issue',
        description: 'Cannot login to account',
        category: 'TECHNICAL',
        priority: TicketPriority.HIGH,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = { create: jest.fn().mockResolvedValue({ id: 'ticket-1', ...validDto, status: TicketStatus.OPEN, createdAt: new Date(), updatedAt: new Date() }) };
        mockHistoryRepo = { create: jest.fn() };
        mockAttachmentRepo = { create: jest.fn() };
        mockEventBus = { publish: jest.fn() };

        useCase = new CreateTicketUseCase(mockTicketRepo, mockHistoryRepo, mockAttachmentRepo, mockEventBus);
    });

    it('should create ticket successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockTicketRepo.create).toHaveBeenCalled();
        expect(mockHistoryRepo.create).toHaveBeenCalled();
    });

    it('should fail with invalid subject', async () => {
        await expect(useCase.execute({ ...validDto, subject: '' })).rejects.toThrow();
    });

    it('should fail with invalid description', async () => {
        await expect(useCase.execute({ ...validDto, description: '' })).rejects.toThrow();
    });

    it('should create ticket with attachments', async () => {
        const dtoWithAttachments = {
            ...validDto,
            attachments: [{ id: 'att-1', fileName: 'screenshot.png', fileUrl: 'url', fileSize: 1024, mimeType: 'image/png' }],
        };

        await useCase.execute(dtoWithAttachments);

        expect(mockAttachmentRepo.create).toHaveBeenCalled();
    });

    it('should publish TicketCreated event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith('TicketCreated', expect.any(Object));
    });

    it('should handle different priorities', async () => {
        const priorities = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT];

        for (const priority of priorities) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, priority });
            expect(mockTicketRepo.create).toHaveBeenCalled();
        }
    });

    it('should handle different categories', async () => {
        const categories = ['TECHNICAL', 'BILLING', 'GENERAL'];

        for (const category of categories) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, category });
            expect(mockTicketRepo.create).toHaveBeenCalled();
        }
    });
});
