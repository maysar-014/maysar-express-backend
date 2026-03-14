/**
 * SMS provider adapter - Africa's Talking
 */

export interface ISmsProvider {
  send(phoneNumber: string, message: string): Promise<void>;
  sendBatch(messages: Array<{ phoneNumber: string; message: string }>): Promise<void>;
}

export class SmsProviderAdapter implements ISmsProvider {
  constructor(private config?: { accountSid?: string; authToken?: string }) {}

  async send(phoneNumber: string, message: string): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.debug('SmsProvider.send', { phoneNumber: phoneNumber.substring(0, 10), len: message.length });
    }
  }

  async sendBatch(messages: Array<{ phoneNumber: string; message: string }>): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.phoneNumber, msg.message);
    }
  }
}
