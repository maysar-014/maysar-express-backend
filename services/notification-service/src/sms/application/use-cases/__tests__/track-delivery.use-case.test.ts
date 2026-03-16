import { TrackDeliveryUseCase } from '../track-delivery.use-case';
import { ISmsRepository } from '../../../domain/repositories/sms.repository';
import { SmsMessage, SmsStatus } from '../../../domain/entities/sms-message.entity';
import { MessageNotFoundError } from '../../../domain/errors/sms.errors';

const mockRepository: jest.Mocked<ISmsRepository> = {
    findById: jest.fn(),
    findByPhoneNumber: jest.fn(),
    findByUserId: jest.fn()
} as any;

describe('TrackDeliveryUseCase', () => {
    let useCase: TrackDeliveryUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new TrackDeliveryUseCase(mockRepository);
    });

    describe('execute', () => {
        it('should return status for existing message', async () => {
            const message = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.DELIVERED,
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockRepository.findById.mockResolvedValue(message);

            const result = await useCase.execute('msg-1');

            expect(result.messageId).toBe('msg-1');
            expect(result.status).toBe(SmsStatus.DELIVERED);
        });

        it('should throw error when message not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(useCase.execute('msg-999')).rejects.toThrow(MessageNotFoundError);
        });
    });

    describe('executeMany', () => {
        it('should return statuses for multiple messages', async () => {
            const message1 = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.SENT,
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const message2 = SmsMessage.reconstitute({
                id: 'msg-2',
                phoneNumber: '+255612834685',
                content: 'Test',
                status: SmsStatus.DELIVERED,
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockRepository.findById
                .mockResolvedValueOnce(message1)
                .mockResolvedValueOnce(message2);

            const result = await useCase.executeMany(['msg-1', 'msg-2']);

            expect(result).toHaveLength(2);
            expect(result[0].messageId).toBe('msg-1');
            expect(result[1].messageId).toBe('msg-2');
        });

        it('should handle not found messages gracefully', async () => {
            mockRepository.findById.mockResolvedValue(null);

            const result = await useCase.executeMany(['msg-999']);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('NOT_FOUND');
        });
    });

    describe('executeByPhoneNumber', () => {
        it('should return messages for phone number', async () => {
            const messages = [
                SmsMessage.reconstitute({
                    id: 'msg-1',
                    phoneNumber: '+255612834684',
                    content: 'Test',
                    status: SmsStatus.SENT,
                    retryCount: 0,
                    maxRetries: 3,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            ];

            mockRepository.findByPhoneNumber.mockResolvedValue(messages);

            const result = await useCase.executeByPhoneNumber('+255612834684');

            expect(result).toHaveLength(1);
            expect(mockRepository.findByPhoneNumber).toHaveBeenCalledWith('+255612834684', 10);
        });
    });

    describe('executeByUserId', () => {
        it('should return messages for user', async () => {
            const messages = [
                SmsMessage.reconstitute({
                    id: 'msg-1',
                    phoneNumber: '+255612834684',
                    content: 'Test',
                    status: SmsStatus.SENT,
                    retryCount: 0,
                    maxRetries: 3,
                    userId: 'user-1',
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            ];

            mockRepository.findByUserId.mockResolvedValue(messages);

            const result = await useCase.executeByUserId('user-1');

            expect(result).toHaveLength(1);
            expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1', 10);
        });
    });
});
