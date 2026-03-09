import {
  SendSmsDtoSchema,
  type BatchSendSmsDto,
  type SendSmsDto,
  type SendSmsResponseDto,
  type SmsResponseDto
} from './sms.dto';

describe('sms.dto', () => {
  it('supports request/response dto contracts', () => {
    const sendDto: SendSmsDto = {
      phoneNumber: '+255712345678',
      message: 'Welcome to Maysar',
      userId: 'user-1',
      metadata: { source: 'test' }
    };
    const batchDto: BatchSendSmsDto = {
      messages: [sendDto]
    };
    const response: SendSmsResponseDto = {
      success: true,
      messageId: 'msg-1',
      status: 'queued',
      segmentCount: 1,
      estimatedCost: 20
    };
    const detailed: SmsResponseDto = {
      id: 'msg-1',
      phoneNumber: sendDto.phoneNumber,
      message: sendDto.message,
      status: 'queued',
      retryCount: 0,
      maxRetries: 3,
      segmentCount: 1,
      encoding: 'GSM',
      createdAt: new Date('2026-03-08T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-03-08T00:00:00.000Z').toISOString()
    };

    expect(batchDto.messages[0].phoneNumber).toBe('+255712345678');
    expect(response.success).toBe(true);
    expect(detailed.status).toBe('queued');
  });

  it('exposes validation schema rules for phone and message constraints', () => {
    const phonePattern = SendSmsDtoSchema.phoneNumber.pattern;

    expect(phonePattern.test('+255712345678')).toBe(true);
    expect(phonePattern.test('0712345678')).toBe(false);
    expect(SendSmsDtoSchema.message.minLength).toBe(1);
    expect(SendSmsDtoSchema.message.maxLength).toBe(1530);
    expect(SendSmsDtoSchema.scheduledAt.type).toBe('date');
    expect(SendSmsDtoSchema.metadata.type).toBe('object');
  });
});
