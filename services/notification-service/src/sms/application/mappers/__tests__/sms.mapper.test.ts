import { SmsMapper } from '../sms.mapper';
import { SmsMessage, SmsStatus } from '../../../domain/entities/sms-message.entity';

describe('SmsMapper', () => {
    describe('toEntity', () => {
        it('should map DTO to entity', () => {
            const dto = {
                phoneNumber: '+254712345678',
                message: 'Test message',
                userId: 'user-1'
            };

            const entity = SmsMapper.toEntity(dto, 'msg-1');

            expect(entity.getId()).toBe('msg-1');
            expect(entity.getPhoneNumber().getValue()).toBe('+254712345678');
            expect(entity.getContent().getValue()).toBe('Test message');
            expect(entity.getUserId()).toBe('user-1');
        });
    });

    describe('toResponseDto', () => {
        it('should map entity to response DTO', () => {
            const entity = SmsMessage.create({
                id: 'msg-1',
                phoneNumber: '+254712345678',
                content: 'Test',
                userId: 'user-1'
            });

            const dto = SmsMapper.toResponseDto(entity);

            expect(dto.id).toBe('msg-1');
            expect(dto.phoneNumber).toBe('+254712345678');
            expect(dto.message).toBe('Test');
            expect(dto.status).toBe(SmsStatus.QUEUED);
            expect(dto.userId).toBe('user-1');
        });
    });

    describe('toStatusDto', () => {
        it('should map entity to status DTO', () => {
            const entity = SmsMessage.create({
                id: 'msg-1',
                phoneNumber: '+254712345678',
                content: 'Test'
            });

            const dto = SmsMapper.toStatusDto(entity);

            expect(dto.messageId).toBe('msg-1');
            expect(dto.status).toBe(SmsStatus.QUEUED);
            expect(dto.phoneNumber).toBe('+254712345678');
            expect(dto.retryCount).toBe(0);
            expect(dto.canRetry).toBe(false);
        });
    });

    describe('toResponseDtoList', () => {
        it('should map multiple entities', () => {
            const entities = [
                SmsMessage.create({ id: 'msg-1', phoneNumber: '+254712345678', content: 'Test1' }),
                SmsMessage.create({ id: 'msg-2', phoneNumber: '+254712345679', content: 'Test2' })
            ];

            const dtos = SmsMapper.toResponseDtoList(entities);

            expect(dtos).toHaveLength(2);
            expect(dtos[0].id).toBe('msg-1');
            expect(dtos[1].id).toBe('msg-2');
        });
    });

    describe('toStatusDtoList', () => {
        it('should map multiple entities to status DTOs', () => {
            const entities = [
                SmsMessage.create({ id: 'msg-1', phoneNumber: '+254712345678', content: 'Test1' }),
                SmsMessage.create({ id: 'msg-2', phoneNumber: '+254712345679', content: 'Test2' })
            ];

            const dtos = SmsMapper.toStatusDtoList(entities);

            expect(dtos).toHaveLength(2);
            expect(dtos[0].messageId).toBe('msg-1');
            expect(dtos[1].messageId).toBe('msg-2');
        });
    });

    describe('toDomainEventPayload', () => {
        it('should extract event payload', () => {
            const entity = SmsMessage.create({
                id: 'msg-1',
                phoneNumber: '+254712345678',
                content: 'Test',
                userId: 'user-1'
            });

            const payload = SmsMapper.toDomainEventPayload(entity);

            expect(payload.messageId).toBe('msg-1');
            expect(payload.phoneNumber).toBe('+254712345678');
            expect(payload.status).toBe(SmsStatus.QUEUED);
            expect(payload.userId).toBe('user-1');
            expect(payload.timestamp).toBeDefined();
        });
    });
});
