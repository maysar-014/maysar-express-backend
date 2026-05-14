import Redis from 'ioredis';

export class RedisPubSub {
  private readonly subscriber: Redis;
  private readonly publisher: Redis;

  constructor(redisUrl: string, password?: string) {
    const opts = password ? { password } : {};
    this.publisher = new Redis(redisUrl, opts);
    this.subscriber = new Redis(redisUrl, opts);
  }

  async publish(conversationId: string, payload: unknown): Promise<void> {
    await this.publisher.publish(
      `chat:conv:${conversationId}`,
      JSON.stringify(payload),
    );
  }

  async subscribe(
    conversationId: string,
    handler: (payload: unknown) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(`chat:conv:${conversationId}`);
    this.subscriber.on('message', (channel, message) => {
      if (channel === `chat:conv:${conversationId}`) {
        try {
          handler(JSON.parse(message));
        } catch {
          // ignore parse errors
        }
      }
    });
  }

  async unsubscribe(conversationId: string): Promise<void> {
    await this.subscriber.unsubscribe(`chat:conv:${conversationId}`);
  }

  async disconnect(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
