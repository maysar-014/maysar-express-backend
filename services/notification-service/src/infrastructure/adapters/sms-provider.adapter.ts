/**
 * SMS provider adapter - Africa's Talking
 */

import { container } from '../../sms/infrastructure/container';
import { TYPES } from '../../sms/infrastructure/types';
import { ISmsProvider as CoreSmsProvider } from '../../sms/infrastructure/providers/sms-provider.interface';

export interface ISmsProvider {
  send(phoneNumber: string, message: string): Promise<void>;
  sendBatch(messages: Array<{ phoneNumber: string; message: string }>): Promise<void>;
}

export class SmsProviderAdapter implements ISmsProvider {
  private provider: CoreSmsProvider;

  constructor(private config?: { accountSid?: string; authToken?: string }) {
    this.provider = container.get<CoreSmsProvider>(TYPES.SmsProvider);
  }

  async send(phoneNumber: string, message: string): Promise<void> {
    const response = await this.provider.send(phoneNumber, message);
    if (response.isFailure()) {
      throw new Error(response.getErrorMessage() || 'SMS delivery failed');
    }
  }

  async sendBatch(messages: Array<{ phoneNumber: string; message: string }>): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.phoneNumber, msg.message);
    }
  }
}
