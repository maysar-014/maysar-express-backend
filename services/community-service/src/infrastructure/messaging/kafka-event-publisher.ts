import { Producer, Kafka, Message } from 'kafkajs';

/**
 * Kafka-based event publisher
 * Publishes domain events to Kafka topics for event-driven communication
 */
export class KafkaEventPublisher {
  private producer: Producer;

  constructor(
    private kafka: Kafka,
    private topicPrefix: string = 'community'
  ) {
    this.producer = this.kafka.producer();
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    await this.producer.connect();
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Publish a post created event
   */
  async publishPostCreated(postId: string, authorId: string, postType: string): Promise<void> {
    const event = {
      id: this.generateEventId(),
      type: 'PostCreated',
      aggregateId: postId,
      aggregateType: 'Post',
      timestamp: new Date().toISOString(),
      payload: {
        postId,
        authorId,
        postType
      },
      metadata: {
        service: 'community-service',
        version: '1.0.0'
      }
    };

    await this.publish('post.created', event);
  }

  /**
   * Publish a post updated event
   */
  async publishPostUpdated(postId: string, authorId: string, changes: any[]): Promise<void> {
    const event = {
      id: this.generateEventId(),
      type: 'PostUpdated',
      aggregateId: postId,
      aggregateType: 'Post',
      timestamp: new Date().toISOString(),
      payload: {
        postId,
        authorId,
        changes
      },
      metadata: {
        service: 'community-service',
        version: '1.0.0'
      }
    };

    await this.publish('post.updated', event);
  }

  /**
   * Publish a post moderated event
   */
  async publishPostModerated(postId: string, moderatorId: string, action: string, reason?: string): Promise<void> {
    const event = {
      id: this.generateEventId(),
      type: 'PostModerated',
      aggregateId: postId,
      aggregateType: 'Post',
      timestamp: new Date().toISOString(),
      payload: {
        postId,
        moderatorId,
        action,
        reason
      },
      metadata: {
        service: 'community-service',
        version: '1.0.0'
      }
    };

    await this.publish('post.moderated', event);
  }

  /**
   * Publish a user followed event
   */
  async publishUserFollowed(followerId: string, followingId: string): Promise<void> {
    const event = {
      id: this.generateEventId(),
      type: 'UserFollowed',
      aggregateId: followerId,
      aggregateType: 'User',
      timestamp: new Date().toISOString(),
      payload: {
        followerId,
        followingId
      },
      metadata: {
        service: 'community-service',
        version: '1.0.0'
      }
    };

    await this.publish('user.followed', event);
  }

  /**
   * Publish a content reported event
   */
  async publishContentReported(reporterId: string, entityType: string, entityId: string, reason: string): Promise<void> {
    const event = {
      id: this.generateEventId(),
      type: 'ContentReported',
      aggregateId: entityId,
      aggregateType: entityType,
      timestamp: new Date().toISOString(),
      payload: {
        reporterId,
        entityType,
        entityId,
        reason
      },
      metadata: {
        service: 'community-service',
        version: '1.0.0'
      }
    };

    await this.publish('content.reported', event);
  }

  /**
   * Publish engagement event (like, comment, share)
   */
  async publishEngagement(engagementType: 'like' | 'comment' | 'share', userId: string, entityType: 'post' | 'comment', entityId: string): Promise<void> {
    const event = {
      id: this.generateEventId(),
      type: 'EngagementCreated',
      aggregateId: entityId,
      aggregateType: entityType,
      timestamp: new Date().toISOString(),
      payload: {
        engagementType,
        userId,
        entityType,
        entityId
      },
      metadata: {
        service: 'community-service',
        version: '1.0.0'
      }
    };

    await this.publish('engagement.created', event);
  }

  /**
   * Generic publish method
   */
  private async publish(topicSuffix: string, event: any): Promise<void> {
    const topic = `${this.topicPrefix}.${topicSuffix}`;

    const message: Message = {
      key: event.aggregateId,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.type,
        'aggregate-type': event.aggregateType,
        'timestamp': event.timestamp,
        'service': event.metadata.service
      }
    };

    try {
      await this.producer.send({
        topic,
        messages: [message]
      });
    } catch (error) {
      console.error(`Failed to publish event to topic ${topic}:`, error);
      throw new Error(`Event publishing failed: ${error}`);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
