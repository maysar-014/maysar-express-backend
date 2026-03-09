import {
  SmsCancelled,
  SmsDelivered,
  SmsFailed,
  SmsQueued,
  SmsSending,
  SmsSent,
  SmsUndelivered
} from './sms.events';

describe('sms.events', () => {
  const fixedNow = new Date('2026-03-08T10:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('creates queued and sending lifecycle events with stable payloads', () => {
    const queued = new SmsQueued('msg-1', '+255712345678', 2, 'user-1');
    const sending = new SmsSending('msg-1', '+255712345678', 'provider-1');

    expect(queued.eventType).toBe('SmsQueued');
    expect(queued.aggregateId).toBe('msg-1');
    expect(queued.eventId.startsWith('SmsQueued-')).toBe(true);
    expect(queued.payload).toEqual({
      messageId: 'msg-1',
      phoneNumber: '+255712345678',
      userId: 'user-1',
      segmentCount: 2
    });

    expect(sending.eventType).toBe('SmsSending');
    expect(sending.payload.providerId).toBe('provider-1');
    expect(sending.occurredAt).toEqual(fixedNow);
  });

  it('creates sent and delivered events with provider metadata', () => {
    const sent = new SmsSent('msg-2', '+255765432109', 'provider-2', 'provider-msg-2');
    const delivered = new SmsDelivered('msg-2', '+255765432109', 'provider-2', 'provider-msg-2');

    expect(sent.eventType).toBe('SmsSent');
    expect(sent.payload.sentAt).toEqual(fixedNow);
    expect(sent.payload.providerMessageId).toBe('provider-msg-2');

    expect(delivered.eventType).toBe('SmsDelivered');
    expect(delivered.payload.deliveredAt).toEqual(fixedNow);
    expect(delivered.payload.phoneNumber).toBe('+255765432109');
  });

  it('creates failure, cancellation and undelivered events with optional fields', () => {
    const failed = new SmsFailed(
      'msg-3',
      '+255700000001',
      'network-timeout',
      1,
      true,
      'provider-3'
    );
    const cancelled = new SmsCancelled('msg-3', '+255700000001', 'user-requested', 2);
    const undelivered = new SmsUndelivered(
      'msg-3',
      '+255700000001',
      'provider-3',
      'provider-msg-3',
      'destination-unreachable'
    );

    expect(failed.eventType).toBe('SmsFailed');
    expect(failed.payload.canRetry).toBe(true);
    expect(failed.payload.providerId).toBe('provider-3');

    expect(cancelled.eventType).toBe('SmsCancelled');
    expect(cancelled.payload.reason).toBe('user-requested');

    expect(undelivered.eventType).toBe('SmsUndelivered');
    expect(undelivered.payload.reason).toBe('destination-unreachable');
  });
});
