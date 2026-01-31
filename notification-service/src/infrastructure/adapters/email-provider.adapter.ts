/**
 * Email provider adapter - SMTP/SendGrid/AWS SES
 */

export interface IEmailProvider {
  send(to: string, subject: string, body: string, html?: string): Promise<void>;
  sendBatch(messages: Array<{ to: string; subject: string; body: string; html?: string }>): Promise<void>;
}

export class EmailProviderAdapter implements IEmailProvider {
  constructor(private config?: { apiKey?: string; from?: string }) {}

  async send(to: string, subject: string, body: string, html?: string): Promise<void> {
    // Stub: integrate with nodemailer, SendGrid, or AWS SES
    if (process.env.NODE_ENV !== 'test') {
      console.debug('EmailProvider.send', { to: to.substring(0, 20), subject });
    }
  }

  async sendBatch(
    messages: Array<{ to: string; subject: string; body: string; html?: string }>
  ): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.to, msg.subject, msg.body, msg.html);
    }
  }
}
