import { CommunicationEngine, CommunicationRequest } from './communication.engine';

const createRedisMock = () => ({
  lrange: jest.fn<Promise<string[]>, [string, number, number]>(),
  set: jest.fn<Promise<void>, [string, string]>(),
  get: jest.fn<Promise<string | null>, [string]>(),
  hget: jest.fn<Promise<string | null>, [string, string]>(),
  hset: jest.fn<Promise<void>, [string, string, string]>(),
  expire: jest.fn<Promise<void>, [string, number]>(),
  lpush: jest.fn<Promise<void>, [string, string]>(),
  ltrim: jest.fn<Promise<void>, [string, number, number]>(),
  setex: jest.fn<Promise<void>, [string, number, string]>()
});

const baseRequest: CommunicationRequest = {
  fromUserId: 'buyer-1',
  fromRole: 'buyer',
  toUserId: 'seller-1',
  toRole: 'seller',
  contextId: 'order-1',
  contextType: 'order',
  message: 'Hello from buyer',
  priority: 'normal'
};

describe('CommunicationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores and delivers message in real time when recipient is online', async () => {
    const redis = createRedisMock();
    redis.get.mockResolvedValue('online');
    const websocketService = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const notificationEngine = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const db = { getActiveUsersByRole: jest.fn().mockResolvedValue([]) };
    const engine = new CommunicationEngine(redis as never, websocketService as never, notificationEngine as never, db as never);

    const result = await engine.sendMessage(baseRequest);

    expect(result.messageId).toMatch(/^msg_/);
    expect(result.delivered).toBe(true);
    expect(result.deliveredAt).toBeInstanceOf(Date);
    expect(result.confidence).toBe(99.9);
    expect(websocketService.sendToUser).toHaveBeenCalledWith(
      'seller-1',
      'new_message',
      expect.objectContaining({
        from: 'buyer-1',
        fromRole: 'buyer',
        contextId: 'order-1',
        contextType: 'order',
        message: 'Hello from buyer',
        priority: 'normal'
      })
    );
    expect(notificationEngine.sendNotification).not.toHaveBeenCalled();
    expect(redis.hset).toHaveBeenCalledWith(expect.stringMatching(/^message:msg_/), 'data', expect.any(String));
    expect(redis.lpush).toHaveBeenCalledWith('conversation:order-1', expect.any(String));
  });

  it('falls back to notification when recipient is offline', async () => {
    const redis = createRedisMock();
    redis.get.mockResolvedValue(null);
    const websocketService = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const notificationEngine = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const db = { getActiveUsersByRole: jest.fn().mockResolvedValue([]) };
    const engine = new CommunicationEngine(redis as never, websocketService as never, notificationEngine as never, db as never);

    const longMessage = 'x'.repeat(120);
    const result = await engine.sendMessage({
      ...baseRequest,
      message: longMessage
    });

    expect(result.delivered).toBe(false);
    expect(notificationEngine.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'seller-1',
        recipientType: 'seller',
        templateId: 'new_message',
        channels: ['push', 'email'],
        priority: 'normal',
        data: expect.objectContaining({
          fromRole: 'buyer',
          contextType: 'order',
          message: `${longMessage.substring(0, 100)}...`
        })
      })
    );
  });

  it('marks a message as read and persists read timestamp on message record', async () => {
    const redis = createRedisMock();
    redis.hget.mockResolvedValue(JSON.stringify({ messageId: 'm-1', status: 'sent' }));
    const websocketService = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const notificationEngine = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const db = { getActiveUsersByRole: jest.fn().mockResolvedValue([]) };
    const engine = new CommunicationEngine(redis as never, websocketService as never, notificationEngine as never, db as never);

    await engine.markMessageAsRead('m-1', 'seller-1');

    expect(redis.set).toHaveBeenCalledWith('message:m-1:read:seller-1', expect.any(String));
    expect(redis.hset).toHaveBeenCalledWith('message:m-1', 'data', expect.stringContaining('"readAt"'));
  });

  it('loads conversation in chronological order and broadcasts to active users by role', async () => {
    const redis = createRedisMock();
    redis.lrange.mockResolvedValue([
      JSON.stringify({ message: 'second' }),
      JSON.stringify({ message: 'first' })
    ]);
    redis.get.mockResolvedValue(null);
    const websocketService = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const notificationEngine = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const db = { getActiveUsersByRole: jest.fn().mockResolvedValue([{ id: 'seller-1' }, { id: 'seller-2' }]) };
    const engine = new CommunicationEngine(redis as never, websocketService as never, notificationEngine as never, db as never);

    const conversation = await engine.getConversation('order-1', 'buyer-1', 'buyer');
    expect(conversation).toEqual([{ message: 'first' }, { message: 'second' }]);

    const sendMessageSpy = jest.spyOn(engine, 'sendMessage').mockResolvedValue({
      messageId: 'msg-1',
      delivered: true,
      confidence: 99.9
    });

    const broadcastResults = await engine.broadcastToRole('seller', 'Broadcast message', 'general', 'admin-1');

    expect(db.getActiveUsersByRole).toHaveBeenCalledWith('seller');
    expect(redis.setex).toHaveBeenCalledWith('active_users:seller', 300, JSON.stringify([{ id: 'seller-1' }, { id: 'seller-2' }]));
    expect(sendMessageSpy).toHaveBeenCalledTimes(2);
    expect(broadcastResults).toHaveLength(2);
  });

  it('rejects disallowed role communication', async () => {
    const redis = createRedisMock();
    const websocketService = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const notificationEngine = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const db = { getActiveUsersByRole: jest.fn().mockResolvedValue([]) };
    const engine = new CommunicationEngine(redis as never, websocketService as never, notificationEngine as never, db as never);

    await expect(
      engine.sendMessage({
        ...baseRequest,
        toRole: 'supplier'
      })
    ).rejects.toThrow('Communication not allowed between buyer and supplier');
  });
});

