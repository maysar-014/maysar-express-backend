import { PrismaSmsRepository } from '../prisma-sms.repository';
import { SmsMessage, SmsStatus } from '../../../domain/entities/sms-message.entity';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    sms_Message: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

describe('PrismaSmsRepository', () => {
    let repository: PrismaSmsRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PrismaSmsRepository(mockPrisma);
    });

    describe('create', () => {
        it('should create message', async () => {
            const message = SmsMessage.create({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test'
            });

            (mockPrisma.sms_Message.create as jest.Mock).mockResolvedValue({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: 'QUEUED',
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const result = await repository.create(message);

            expect(result.getId()).toBe('msg-1');
            expect(mockPrisma.sms_Message.create).toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should find message by ID', async () => {
            (mockPrisma.sms_Message.findUnique as jest.Mock).mockResolvedValue({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: 'SENT',
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const result = await repository.findById('msg-1');

            expect(result).not.toBeNull();
            expect(result?.getId()).toBe('msg-1');
        });

        it('should return null when not found', async () => {
            (mockPrisma.sms_Message.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.findById('msg-999');

            expect(result).toBeNull();
        });
    });

    describe('findByStatus', () => {
        it('should find messages by status', async () => {
            (mockPrisma.sms_Message.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'msg-1',
                    phoneNumber: '+255612834684',
                    content: 'Test',
                    status: 'FAILED',
                    retryCount: 1,
                    maxRetries: 3,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);

            const result = await repository.findByStatus(SmsStatus.FAILED);

            expect(result).toHaveLength(1);
            expect(result[0].getStatus()).toBe(SmsStatus.FAILED);
        });
    });

    describe('findByUserId', () => {
        it('should find messages by user ID', async () => {
            (mockPrisma.sms_Message.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'msg-1',
                    phoneNumber: '+255612834684',
                    content: 'Test',
                    status: 'SENT',
                    userId: 'user-1',
                    retryCount: 0,
                    maxRetries: 3,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);

            const result = await repository.findByUserId('user-1');

            expect(result).toHaveLength(1);
        });
    });

    describe('findFailedMessagesForRetry', () => {
        it('should find failed messages eligible for retry', async () => {
            (mockPrisma.sms_Message.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'msg-1',
                    phoneNumber: '+255612834684',
                    content: 'Test',
                    status: 'FAILED',
                    retryCount: 1,
                    maxRetries: 3,
                    failedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);

            const result = await repository.findFailedMessagesForRetry(3);

            expect(result).toHaveLength(1);
            expect(result[0].isFailed()).toBe(true);
        });
    });

    describe('update', () => {
        it('should update message', async () => {
            const message = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.SENT,
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            (mockPrisma.sms_Message.update as jest.Mock).mockResolvedValue({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: 'SENT',
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const result = await repository.update(message);

            expect(result.getId()).toBe('msg-1');
            expect(mockPrisma.sms_Message.update).toHaveBeenCalled();
        });
    });

    describe('getStatistics', () => {
        it('should return statistics', async () => {
            (mockPrisma.sms_Message.count as jest.Mock)
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(10)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(80)
                .mockResolvedValueOnce(75)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);

            const result = await repository.getStatistics(new Date(), new Date());

            expect(result.total).toBe(100);
            expect(result.delivered).toBe(75);
            expect(result.failed).toBe(5);
        });
    });

    describe('deleteOlderThan', () => {
        it('should delete old messages', async () => {
            (mockPrisma.sms_Message.deleteMany as jest.Mock).mockResolvedValue({ count: 50 });

            const result = await repository.deleteOlderThan(new Date());

            expect(result).toBe(50);
            expect(mockPrisma.sms_Message.deleteMany).toHaveBeenCalled();
        });
    });
});
