export interface NotificationInput {
  recipientId: string;
  recipientType: 'customer' | 'seller' | 'courier' | 'admin' | 'enabler';
  channels: NotificationChannel[];
  templateId: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  scheduledAt?: Date;
  expiryTime?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  type: 'sms' | 'email' | 'push' | 'whatsapp' | 'in_app';
  address: string;
  preferred: boolean;
  verified: boolean;
}

export interface NotificationOutput {
  success: boolean;
  notificationId: string;
  sent: ChannelResult[];
  delivered: ChannelResult[];
  failed: ChannelResult[];
  retryScheduled: ChannelResult[];
  totalRecipients: number;
  deliveryRate: number;
  confidence: number;
  processingTime: number;
  warnings: string[];
  recommendations: string[];
}

export interface ChannelResult {
  channel: string;
  address: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending' | 'retry_scheduled';
  timestamp: Date;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
  nextRetryAt?: Date;
}

export interface NotificationTemplate {
  templateId: string;
  name: string;
  category: 'order' | 'payment' | 'delivery' | 'system' | 'marketing';
  channels: TemplateChannel[];
  variables: string[];
  priority: string;
  expiryMinutes: number;
}

export interface TemplateChannel {
  type: string;
  subject?: string;
  content: string;
  format: 'text' | 'html' | 'json';
  maxLength?: number;
}

export class NotificationEngine {
  private readonly ACCURACY_TARGET = 99.5;
  private readonly MAX_PROCESSING_TIME = 15; // ms
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [30, 300, 1800]; // 30s, 5min, 30min

  async processNotificationRequest(input: NotificationInput): Promise<NotificationOutput> {
    const startTime = Date.now();
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const validationResult = await this.validateInput(input);
      if (!validationResult.valid) {
        throw new Error(`Notification validation failed: ${validationResult.errors.join(', ')}`);
      }

      const [template, recipientData, channelConfigs, deliveryRules] = await Promise.all([
        this.getTemplate(input.templateId),
        this.getRecipientData(input.recipientId, input.recipientType),
        this.getChannelConfigurations(input.channels),
        this.getDeliveryRules(input.priority)
      ]);

      const processedMessages = await this.processTemplate(template, input.data, input.channels);
      const deliveryResults = await this.deliverToChannels(processedMessages, channelConfigs, deliveryRules, notificationId);

      const sent = deliveryResults.filter(r => r.status === 'sent' || r.status === 'delivered');
      const delivered = deliveryResults.filter(r => r.status === 'delivered');
      const failed = deliveryResults.filter(r => r.status === 'failed');
      const retryScheduled = deliveryResults.filter(r => r.status === 'retry_scheduled');

      const totalRecipients = input.channels.length;
      const deliveryRate = (sent.length / totalRecipients) * 100;
      const confidence = this.calculateConfidence(template, deliveryResults, recipientData, channelConfigs);
      const processingTime = Date.now() - startTime;

      await this.scheduleRetries(failed, input, notificationId);

      return {
        success: true,
        notificationId,
        sent,
        delivered,
        failed,
        retryScheduled,
        totalRecipients,
        deliveryRate,
        confidence,
        processingTime,
        warnings: [],
        recommendations: []
      };

    } catch (error: any) {
      return {
        success: false,
        notificationId,
        sent: [],
        delivered: [],
        failed: input.channels.map(channel => ({
          channel: channel.type,
          address: channel.address,
          status: 'failed' as const,
          timestamp: new Date(),
          errorMessage: error.message
        })),
        retryScheduled: [],
        totalRecipients: input.channels.length,
        deliveryRate: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
        warnings: [error.message],
        recommendations: ['Check notification configuration', 'Verify recipient data']
      };
    }
  }

  private async validateInput(input: NotificationInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!input.recipientId) errors.push('Recipient ID required');
    if (!input.templateId) errors.push('Template ID required');
    if (!input.channels || input.channels.length === 0) errors.push('At least one channel required');
    if (!['low', 'normal', 'high', 'urgent', 'emergency'].includes(input.priority)) errors.push('Invalid priority');

    input.channels?.forEach((channel, index) => {
      if (!['sms', 'email', 'push', 'whatsapp', 'in_app'].includes(channel.type)) {
        errors.push(`Invalid channel type at index ${index}`);
      }
      if (!channel.address) {
        errors.push(`Channel address required at index ${index}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  private async getTemplate(templateId: string): Promise<NotificationTemplate> {
    const templates: Record<string, NotificationTemplate> = {
      'order_confirmed': {
        templateId: 'order_confirmed',
        name: 'Order Confirmation',
        category: 'order',
        channels: [
          { type: 'sms', content: 'Order {{orderId}} confirmed! Total: {{totalAmount}} {{currency}}', format: 'text', maxLength: 160 },
          { type: 'email', subject: 'Order Confirmation - {{orderId}}', content: '<h1>Order Confirmed</h1><p>Your order {{orderId}} has been confirmed.</p>', format: 'html' }
        ],
        variables: ['orderId', 'totalAmount', 'currency'],
        priority: 'high',
        expiryMinutes: 60
      }
    };

    return templates[templateId] || {
      templateId: 'default',
      name: 'Default Template',
      category: 'system',
      channels: [{ type: 'sms', content: 'Notification: {{message}}', format: 'text' }],
      variables: ['message'],
      priority: 'normal',
      expiryMinutes: 60
    };
  }

  private async getRecipientData(recipientId: string, recipientType: string): Promise<any> {
    return {
      recipientId,
      recipientType,
      preferences: { sms: true, email: true, push: true, whatsapp: false },
      timezone: 'Africa/Dar_es_Salaam',
      language: 'en',
      verified: true
    };
  }

  private async getChannelConfigurations(channels: NotificationChannel[]): Promise<any> {
    return {
      sms: { provider: 'Africa\'s Talking', reliability: 0.98, avgDeliveryTime: 5 },
      email: { provider: 'SendGrid', reliability: 0.99, avgDeliveryTime: 2 },
      push: { provider: 'Firebase', reliability: 0.95, avgDeliveryTime: 1 },
      whatsapp: { provider: 'WhatsApp Business', reliability: 0.97, avgDeliveryTime: 3 },
      in_app: { provider: 'Internal', reliability: 0.999, avgDeliveryTime: 0.1 }
    };
  }

  private async getDeliveryRules(priority: string): Promise<any> {
    const rules = {
      emergency: { maxRetries: 5, retryDelays: [10, 30, 60, 300, 900], timeout: 30 },
      urgent: { maxRetries: 3, retryDelays: [30, 300, 1800], timeout: 60 },
      high: { maxRetries: 3, retryDelays: [60, 600, 3600], timeout: 120 },
      normal: { maxRetries: 2, retryDelays: [300, 1800], timeout: 300 },
      low: { maxRetries: 1, retryDelays: [1800], timeout: 600 }
    };

    return rules[priority as keyof typeof rules] || rules.normal;
  }

  private async processTemplate(template: NotificationTemplate, data: Record<string, any>, channels: NotificationChannel[]): Promise<any[]> {
    const processedMessages: any[] = [];

    for (const channel of channels) {
      const templateChannel = template.channels.find(tc => tc.type === channel.type);
      if (!templateChannel) continue;

      let content = templateChannel.content;
      let subject = templateChannel.subject;

      template.variables.forEach(variable => {
        const value = data[variable] || `{{${variable}}}`;
        content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        if (subject) {
          subject = subject.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        }
      });

      if (templateChannel.maxLength && content.length > templateChannel.maxLength) {
        content = content.substring(0, templateChannel.maxLength - 3) + '...';
      }

      processedMessages.push({
        channel: channel.type,
        address: channel.address,
        subject,
        content,
        format: templateChannel.format,
        preferred: channel.preferred,
        verified: channel.verified
      });
    }

    return processedMessages;
  }

  private async deliverToChannels(messages: any[], channelConfigs: any, deliveryRules: any, notificationId: string): Promise<ChannelResult[]> {
    const results: ChannelResult[] = [];

    for (const message of messages) {
      try {
        const channelConfig = channelConfigs[message.channel];
        const deliverySuccess = Math.random() < channelConfig.reliability;

        if (deliverySuccess) {
          results.push({
            channel: message.channel,
            address: message.address,
            status: 'delivered',
            timestamp: new Date(),
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
          });
        } else {
          results.push({
            channel: message.channel,
            address: message.address,
            status: 'failed',
            timestamp: new Date(),
            errorCode: 'DELIVERY_FAILED',
            errorMessage: 'Channel delivery failed',
            retryCount: 0
          });
        }
      } catch (error: any) {
        results.push({
          channel: message.channel,
          address: message.address,
          status: 'failed',
          timestamp: new Date(),
          errorMessage: error.message,
          retryCount: 0
        });
      }
    }

    return results;
  }

  private async scheduleRetries(failedDeliveries: ChannelResult[], input: NotificationInput, notificationId: string): Promise<void> {
    for (const failed of failedDeliveries) {
      const retryCount = (failed.retryCount || 0) + 1;
      if (retryCount <= this.MAX_RETRY_ATTEMPTS) {
        const retryDelay = this.RETRY_DELAYS[retryCount - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        failed.nextRetryAt = new Date(Date.now() + retryDelay * 1000);
        failed.status = 'retry_scheduled';
        failed.retryCount = retryCount;
      }
    }
  }

  private calculateConfidence(template: NotificationTemplate, results: ChannelResult[], recipientData: any, channelConfigs: any): number {
    const factors = {
      templateAccuracy: template.variables.length > 0 ? 0.98 : 0.95,
      channelReliability: Object.values(channelConfigs).reduce((avg: number, config: any) => avg + config.reliability, 0) / Object.keys(channelConfigs).length,
      deliverySuccess: (results.filter(r => r.status === 'delivered').length / results.length),
      recipientValidation: recipientData.verified ? 0.99 : 0.85,
      systemReliability: 0.999
    };

    const confidence = Object.entries(factors).reduce((total, [key, value]) => {
      return total + (value * 0.2);
    }, 0) * 100;

    return Math.min(confidence, 99.9);
  }
}
