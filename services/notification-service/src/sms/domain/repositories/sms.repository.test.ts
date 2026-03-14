import { SmsMessage, SmsStatus } from '../entities/sms-message.entity';
import { ISmsRepository } from './sms.repository';

class InMemorySmsRepository implements ISmsRepository {
  private messages = new Map<string, SmsMessage>();

  async create(message: SmsMessage): Promise<SmsMessage> {
    this.messages.set(message.getId(), message);
    return message;
  }

  async findById(id: string): Promise<SmsMessage | null> {
    return this.messages.get(id) ?? null;
  }

  async findByStatus(status: SmsStatus, limit = Number.MAX_SAFE_INTEGER): Promise<SmsMessage[]> {
    return Array.from(this.messages.values())
      .filter(m => m.getStatus() === status)
      .slice(0, limit);
  }

  async findByUserId(userId: string, limit = Number.MAX_SAFE_INTEGER): Promise<SmsMessage[]> {
    return Array.from(this.messages.values())
      .filter(m => m.getUserId() === userId)
      .slice(0, limit);
  }

  async findByPhoneNumber(phoneNumber: string, limit = Number.MAX_SAFE_INTEGER): Promise<SmsMessage[]> {
    return Array.from(this.messages.values())
      .filter(m => m.getPhoneNumber().getValue() === phoneNumber)
      .slice(0, limit);
  }

  async findFailedMessagesForRetry(maxRetries: number): Promise<SmsMessage[]> {
    return Array.from(this.messages.values()).filter(
      m => m.getStatus() === SmsStatus.FAILED && m.getRetryCount() < maxRetries
    );
  }

  async update(message: SmsMessage): Promise<SmsMessage> {
    this.messages.set(message.getId(), message);
    return message;
  }

  async delete(id: string): Promise<void> {
    this.messages.delete(id);
  }

  async getMessageCountInWindow(
    _startTime: Date,
    _endTime: Date,
    filters?: { userId?: string; phoneNumber?: string; status?: SmsStatus[] }
  ): Promise<number> {
    return Array.from(this.messages.values()).filter(m => {
      if (filters?.userId && m.getUserId() !== filters.userId) return false;
      if (filters?.phoneNumber && m.getPhoneNumber().getValue() !== filters.phoneNumber) return false;
      if (filters?.status && !filters.status.includes(m.getStatus())) return false;
      return true;
    }).length;
  }

  async getMessagesToPhoneNumberInWindow(
    phoneNumber: string,
    _startTime: Date,
    _endTime: Date
  ): Promise<SmsMessage[]> {
    return this.findByPhoneNumber(phoneNumber);
  }

  async getMessagesByUserInWindow(
    userId: string,
    _startTime: Date,
    _endTime: Date
  ): Promise<SmsMessage[]> {
    return this.findByUserId(userId);
  }

  async findByProviderMessageId(providerId: string, providerMessageId: string): Promise<SmsMessage | null> {
    return (
      Array.from(this.messages.values()).find(
        m => m.getProviderId() === providerId && m.getProviderMessageId() === providerMessageId
      ) ?? null
    );
  }

  async getStatistics(_startTime: Date, _endTime: Date) {
    const statuses = Array.from(this.messages.values()).map(m => m.getStatus());
    const count = (status: SmsStatus) => statuses.filter(s => s === status).length;
    return {
      total: statuses.length,
      queued: count(SmsStatus.QUEUED),
      sending: count(SmsStatus.SENDING),
      sent: count(SmsStatus.SENT),
      delivered: count(SmsStatus.DELIVERED),
      failed: count(SmsStatus.FAILED),
      cancelled: count(SmsStatus.CANCELLED),
      undelivered: count(SmsStatus.UNDELIVERED)
    };
  }

  async deleteOlderThan(_date: Date): Promise<number> {
    const total = this.messages.size;
    this.messages.clear();
    return total;
  }
}

const makeMessage = (id: string, overrides: Partial<{ status: SmsStatus; retryCount: number }> = {}): SmsMessage =>
  SmsMessage.reconstitute({
    id,
    phoneNumber: '+255700000001',
    content: 'Hello this is a valid sms content',
    status: overrides.status ?? SmsStatus.QUEUED,
    userId: 'user-1',
    retryCount: overrides.retryCount ?? 0,
    maxRetries: 3,
    createdAt: new Date('2026-03-09T00:00:00.000Z'),
    updatedAt: new Date('2026-03-09T00:00:00.000Z')
  });

describe('ISmsRepository contract', () => {
  let repo: InMemorySmsRepository;

  beforeEach(() => {
    repo = new InMemorySmsRepository();
  });

  it('creates and finds message by id', async () => {
    const message = makeMessage('m1');
    await repo.create(message);

    const found = await repo.findById('m1');
    const missing = await repo.findById('missing');

    expect(found?.getId()).toBe('m1');
    expect(missing).toBeNull();
  });

  it('filters messages by status with limit', async () => {
    await repo.create(makeMessage('m1', { status: SmsStatus.QUEUED }));
    await repo.create(makeMessage('m2', { status: SmsStatus.QUEUED }));
    await repo.create(makeMessage('m3', { status: SmsStatus.FAILED }));

    const queuedLimited = await repo.findByStatus(SmsStatus.QUEUED, 1);
    const failed = await repo.findByStatus(SmsStatus.FAILED);

    expect(queuedLimited).toHaveLength(1);
    expect(failed[0].getId()).toBe('m3');
  });

  it('finds messages by user and phone number', async () => {
    await repo.create(makeMessage('m1'));
    await repo.create(
      SmsMessage.reconstitute({
        id: 'm2',
        phoneNumber: '+255700000099',
        content: 'Another valid sms message content',
        status: SmsStatus.QUEUED,
        userId: 'user-2',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );

    const byUser = await repo.findByUserId('user-1');
    const byPhone = await repo.findByPhoneNumber('+255700000099');

    expect(byUser).toHaveLength(1);
    expect(byPhone[0].getId()).toBe('m2');
  });

  it('returns failed messages eligible for retry', async () => {
    await repo.create(makeMessage('m1', { status: SmsStatus.FAILED, retryCount: 1 }));
    await repo.create(makeMessage('m2', { status: SmsStatus.FAILED, retryCount: 3 }));
    await repo.create(makeMessage('m3', { status: SmsStatus.QUEUED, retryCount: 0 }));

    const retryable = await repo.findFailedMessagesForRetry(3);

    expect(retryable.map(m => m.getId())).toEqual(['m1']);
  });

  it('updates and deletes messages', async () => {
    const message = makeMessage('m1');
    await repo.create(message);

    const updated = SmsMessage.reconstitute({
      id: message.getId(),
      phoneNumber: message.getPhoneNumber().getValue(),
      content: message.getContent().getValue(),
      status: SmsStatus.SENDING,
      userId: message.getUserId(),
      retryCount: message.getRetryCount(),
      maxRetries: message.getMaxRetries(),
      createdAt: message.getCreatedAt(),
      updatedAt: new Date()
    });

    await repo.update(updated);
    expect((await repo.findById('m1'))?.getStatus()).toBe(SmsStatus.SENDING);

    await repo.delete('m1');
    expect(await repo.findById('m1')).toBeNull();
  });

  it('supports statistics, provider lookup, and cleanup methods', async () => {
    const sent = SmsMessage.reconstitute({
      id: 'm1',
      phoneNumber: '+255700000001',
      content: 'sent message content',
      status: SmsStatus.SENT,
      providerId: 'africastalking',
      providerMessageId: 'pm-1',
      userId: 'user-1',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const failed = makeMessage('m2', { status: SmsStatus.FAILED, retryCount: 1 });

    await repo.create(sent);
    await repo.create(failed);

    const count = await repo.getMessageCountInWindow(new Date(0), new Date(), {
      status: [SmsStatus.SENT, SmsStatus.FAILED]
    });
    const provider = await repo.findByProviderMessageId('africastalking', 'pm-1');
    const stats = await repo.getStatistics(new Date(0), new Date());
    const deleted = await repo.deleteOlderThan(new Date());

    expect(count).toBe(2);
    expect(provider?.getId()).toBe('m1');
    expect(stats.total).toBe(2);
    expect(stats.sent).toBe(1);
    expect(stats.failed).toBe(1);
    expect(deleted).toBe(2);
  });
});
