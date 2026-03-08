export interface CommunicationRequest {
  fromUserId: string;
  fromRole: string;
  toUserId: string;
  toRole: string;
  contextId: string; // orderId, disputeId, etc.
  contextType: 'order' | 'dispute' | 'support' | 'general';
  message: string;
  attachments?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface CommunicationResult {
  messageId: string;
  delivered: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  confidence: number;
}

interface RedisClient {
  lrange(key: string, start: number, end: number): Promise<string[]>;
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  lpush(key: string, value: string): Promise<void>;
  ltrim(key: string, start: number, end: number): Promise<void>;
  setex(key: string, ttlSeconds: number, value: string): Promise<void>;
}

interface WebsocketService {
  sendToUser(userId: string, event: string, payload: unknown): Promise<void>;
}

interface NotificationEngine {
  sendNotification(request: {
    recipientId: string;
    recipientType: string;
    templateId: string;
    data: Record<string, unknown>;
    channels: string[];
    priority: CommunicationRequest['priority'];
  }): Promise<void>;
}

interface UserDataStore {
  getActiveUsersByRole(role: string): Promise<Array<{ id: string }>>;
}

const defaultRedisClient: RedisClient = {
  lrange: async () => [],
  set: async () => { },
  get: async () => null,
  hget: async () => null,
  hset: async () => { },
  expire: async () => { },
  lpush: async () => { },
  ltrim: async () => { },
  setex: async () => { }
};

const defaultWebsocketService: WebsocketService = {
  sendToUser: async () => { }
};

const defaultNotificationEngine: NotificationEngine = {
  sendNotification: async () => { }
};

const defaultUserDataStore: UserDataStore = {
  getActiveUsersByRole: async () => []
};

export class CommunicationEngine {
  private readonly MESSAGE_TTL = 2592000; // 30 days
  private readonly DELIVERY_TARGET = 99.9;

  constructor(
    private readonly redis: RedisClient = defaultRedisClient,
    private readonly websocketService: WebsocketService = defaultWebsocketService,
    private readonly notificationEngine: NotificationEngine = defaultNotificationEngine,
    private readonly db: UserDataStore = defaultUserDataStore
  ) { }

  async sendMessage(request: CommunicationRequest): Promise<CommunicationResult> {
    // Validate communication rules
    await this.validateCommunicationRules(request.fromRole, request.toRole, request.contextType);
    
    const messageId = this.generateMessageId();
    
    // Store message
    await this.storeMessage(messageId, request);
    
    // Send real-time notification
    const delivered = await this.deliverRealTimeMessage(request.toUserId, {
      messageId,
      from: request.fromUserId,
      fromRole: request.fromRole,
      contextId: request.contextId,
      contextType: request.contextType,
      message: request.message,
      timestamp: new Date(),
      priority: request.priority
    });
    
    // Send fallback notification if needed
    if (!delivered) {
      await this.sendFallbackNotification(request);
    }
    
    // Log communication
    await this.logCommunication(messageId, request);
    
    return {
      messageId,
      delivered,
      deliveredAt: delivered ? new Date() : undefined,
      confidence: 99.9
    };
  }

  async getConversation(contextId: string, userId: string, role: string): Promise<any[]> {
    // Check if user can access this conversation
    await this.validateConversationAccess(contextId, userId, role);
    
    const messages = await this.redis.lrange(`conversation:${contextId}`, 0, -1);
    return messages.map((msg: string) => JSON.parse(msg)).reverse();
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const readKey = `message:${messageId}:read:${userId}`;
    await this.redis.set(readKey, new Date().toISOString());
    
    // Update message status
    const messageKey = `message:${messageId}`;
    const message = await this.redis.hget(messageKey, 'data');
    if (message) {
      const messageData = JSON.parse(message);
      messageData.readAt = new Date();
      await this.redis.hset(messageKey, 'data', JSON.stringify(messageData));
    }
  }

  async broadcastToRole(
    role: string, 
    message: string, 
    contextType: string,
    fromUserId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<CommunicationResult[]> {
    const recipients = await this.getActiveUsersByRole(role);
    
    const requests: CommunicationRequest[] = recipients.map(recipient => ({
      fromUserId,
      fromRole: 'admin', // Broadcasts typically from admin
      toUserId: recipient.id,
      toRole: role,
      contextId: `broadcast_${Date.now()}`,
      contextType: contextType as CommunicationRequest['contextType'],
      message,
      priority
    }));
    
    return Promise.all(requests.map(req => this.sendMessage(req)));
  }

  private async validateCommunicationRules(fromRole: string, toRole: string, contextType: string): Promise<void> {
    const allowedCommunications: Record<string, string[]> = {
      buyer: ['seller', 'courier', 'admin'],
      seller: ['buyer', 'supplier', 'courier', 'admin'],
      courier: ['buyer', 'seller', 'admin'],
      supplier: ['seller', 'admin'],
      admin: ['buyer', 'seller', 'courier', 'supplier']
    };
    
    if (!allowedCommunications[fromRole]?.includes(toRole)) {
      throw new Error(`Communication not allowed between ${fromRole} and ${toRole}`);
    }
  }

  private async storeMessage(messageId: string, request: CommunicationRequest): Promise<void> {
    const messageData = {
      ...request,
      messageId,
      timestamp: new Date(),
      status: 'sent'
    };
    
    // Store individual message
    await this.redis.hset(`message:${messageId}`, 'data', JSON.stringify(messageData));
    await this.redis.expire(`message:${messageId}`, this.MESSAGE_TTL);
    
    // Add to conversation thread
    await this.redis.lpush(`conversation:${request.contextId}`, JSON.stringify(messageData));
    await this.redis.expire(`conversation:${request.contextId}`, this.MESSAGE_TTL);
    
    // Add to user's message list
    await this.redis.lpush(`user:${request.toUserId}:messages`, messageId);
    await this.redis.ltrim(`user:${request.toUserId}:messages`, 0, 999); // Keep last 1000 messages
  }

  private async deliverRealTimeMessage(userId: string, messageData: unknown): Promise<boolean> {
    try {
      // Check if user is online
      const isOnline = await this.redis.get(`user:${userId}:online`);
      if (!isOnline) return false;
      
      // Send via WebSocket
      await this.websocketService.sendToUser(userId, 'new_message', messageData);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async sendFallbackNotification(request: CommunicationRequest): Promise<void> {
    await this.notificationEngine.sendNotification({
      recipientId: request.toUserId,
      recipientType: request.toRole,
      templateId: 'new_message',
      data: {
        fromRole: request.fromRole,
        contextType: request.contextType,
        message: request.message.substring(0, 100) + '...'
      },
      channels: ['push', 'email'],
      priority: request.priority
    });
  }

  private async validateConversationAccess(contextId: string, userId: string, role: string): Promise<void> {
    // Check if user is part of this conversation context
    const hasAccess = await this.checkContextAccess(contextId, userId, role);
    if (!hasAccess) {
      throw new Error('Access denied to conversation');
    }
  }

  private async checkContextAccess(contextId: string, userId: string, role: string): Promise<boolean> {
    // Implementation depends on context type
    // For orders: check if user is buyer, seller, courier, or admin
    // For disputes: check if user is involved party or admin
    return true; // Simplified for now
  }

  private async getActiveUsersByRole(role: string): Promise<any[]> {
    const cacheKey = `active_users:${role}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const users = await this.db.getActiveUsersByRole(role);
    await this.redis.setex(cacheKey, 300, JSON.stringify(users)); // 5 min cache
    return users;
  }

  private async logCommunication(messageId: string, request: CommunicationRequest): Promise<void> {
    const logEntry = {
      messageId,
      fromUserId: request.fromUserId,
      fromRole: request.fromRole,
      toUserId: request.toUserId,
      toRole: request.toRole,
      contextId: request.contextId,
      contextType: request.contextType,
      timestamp: new Date(),
      priority: request.priority
    };
    
    await this.redis.lpush('communication_log', JSON.stringify(logEntry));
    await this.redis.ltrim('communication_log', 0, 9999); // Keep last 10k logs
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
