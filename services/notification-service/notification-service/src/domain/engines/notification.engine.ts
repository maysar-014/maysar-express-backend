import { getModelPrefix, makeId } from '@shared/ids/id';

export interface NotificationRequest {
  recipientId: string;
  recipientType: 'buyer' | 'seller' | 'courier' | 'supplier' | 'admin';
  templateId: string;
  data: Record<string, any>;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface NotificationResult {
  notificationId: string;
  status: 'sent' | 'failed' | 'scheduled' | 'queued';
  deliveryResults: ChannelResult[];
  confidence: number;
}

export interface ChannelResult {
  channel: string;
  status: 'delivered' | 'failed' | 'pending';
  deliveredAt?: Date;
  error?: string;
}

export class NotificationEngine {
  private readonly BATCH_SIZE = 100;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly DELIVERY_TARGET = 99.8;

  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    const notificationId = this.generateNotificationId();
    
    // Get recipient preferences
    const preferences = await this.getRecipientPreferences(request.recipientId);
    const enabledChannels = this.filterChannelsByPreferences(request.channels, preferences);
    
    // Process template
    const content = await this.processTemplate(request.templateId, request.data);
    
    // Send across channels in parallel
    const deliveryPromises = enabledChannels.map(channel => 
      this.sendToChannel(channel, request.recipientId, content, request.priority)
    );
    
    const deliveryResults = await Promise.allSettled(deliveryPromises);
    
    // Log notification
    await this.logNotification(notificationId, request, deliveryResults);
    
    return {
      notificationId,
      status: this.determineOverallStatus(deliveryResults),
      deliveryResults: this.mapDeliveryResults(deliveryResults, enabledChannels),
      confidence: this.calculateConfidence(deliveryResults)
    };
  }

  async sendBulkNotifications(requests: NotificationRequest[]): Promise<NotificationResult[]> {
    const batches = this.createBatches(requests, this.BATCH_SIZE);
    const results: NotificationResult[] = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(request => this.sendNotification(request))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  async sendRoleBasedNotification(
    role: string, 
    templateId: string, 
    data: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<NotificationResult[]> {
    const recipients = await this.getRecipientsByRole(role);
    
    const requests: NotificationRequest[] = recipients.map(recipient => ({
      recipientId: recipient.id,
      recipientType: role as any,
      templateId,
      data: { ...data, recipientName: recipient.name },
      channels: this.getDefaultChannelsForRole(role),
      priority
    }));
    
    return this.sendBulkNotifications(requests);
  }

  private async sendToChannel(
    channel: string, 
    recipientId: string, 
    content: any, 
    priority: string
  ): Promise<ChannelResult> {
    try {
      const provider = this.getChannelProvider(channel);
      const result = await provider.send(recipientId, content, priority);
      
      return {
        channel,
        status: 'delivered',
        deliveredAt: new Date()
      };
    } catch (error: any) {
      return {
        channel,
        status: 'failed',
        error: error.message
      };
    }
  }

  private async processTemplate(templateId: string, data: Record<string, any>): Promise<any> {
    const template = await this.getTemplate(templateId);
    return {
      subject: this.interpolateTemplate(template.subject, data),
      body: this.interpolateTemplate(template.body, data),
      html: this.interpolateTemplate(template.html, data)
    };
  }

  private async getRecipientPreferences(recipientId: string): Promise<any> {
    const cacheKey = `prefs:${recipientId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const preferences = await this.db.getRecipientPreferences(recipientId);
    await this.redis.setex(cacheKey, 3600, JSON.stringify(preferences));
    return preferences;
  }

  private filterChannelsByPreferences(channels: string[], preferences: any): string[] {
    return channels.filter(channel => preferences[channel] !== false);
  }

  private getDefaultChannelsForRole(role: string): ('email' | 'sms' | 'push' | 'in_app')[] {
    const roleChannels: Record<string, ('email' | 'sms' | 'push' | 'in_app')[]> = {
      buyer: ['email', 'push', 'in_app'],
      seller: ['email', 'sms', 'in_app'],
      courier: ['sms', 'push', 'in_app'],
      supplier: ['email', 'in_app'],
      admin: ['email', 'sms', 'in_app']
    };
    return roleChannels[role] || ['email'];
  }

  private determineOverallStatus(results: PromiseSettledResult<ChannelResult>[]): 'sent' | 'failed' | 'scheduled' | 'queued' {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    return successful > 0 ? 'sent' : 'failed';
  }

  private mapDeliveryResults(results: PromiseSettledResult<ChannelResult>[], channels: string[]): ChannelResult[] {
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          channel: channels[index],
          status: 'failed',
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  private calculateConfidence(results: PromiseSettledResult<ChannelResult>[]): number {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    return (successful / results.length) * 100;
  }

  private generateNotificationId(): string {
    return makeId(getModelPrefix('Notification'));
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }

  private getChannelProvider(channel: string): any {
    // Return appropriate provider based on channel
    return this.channelProviders[channel];
  }

  private channelProviders: Record<string, any> = {};
}
