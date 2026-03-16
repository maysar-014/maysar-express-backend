import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { createLogger } from '../../../../../shared/logger/logger';

const logger = createLogger('EmailProviderAdapter');

export interface IEmailProvider {
  send(to: string, subject: string, body: string, html?: string): Promise<void>;
  sendBatch(messages: Array<{ to: string; subject: string; body: string; html?: string }>): Promise<void>;
}

export class EmailProviderAdapter implements IEmailProvider {
  private transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private config?: { from?: string }) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP configuration is incomplete. SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    }

    const fromAddress = process.env.SMTP_FROM || smtpUser;
    const fromName = process.env.SMTP_FROM_NAME;
    this.fromAddress = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10
    });

    this.verifyConnection();
  }

  private verifyConnection(): void {
    this.transporter.verify((error) => {
      if (error) {
        logger.error('SMTP connection verification failed', error);
      } else {
        logger.info('SMTP connection verified successfully');
      }
    });
  }

  async send(to: string, subject: string, body: string, html?: string): Promise<void> {
    try {
      const info: SentMessageInfo = await this.transporter.sendMail({
        from: this.config?.from || this.fromAddress,
        to,
        subject,
        text: body,
        html: html || undefined
      });

      logger.info('Email sent', { messageId: info.messageId, to: to.substring(0, 20), subject });
    } catch (error) {
      logger.error('Failed to send email', error, { to: to.substring(0, 20), subject });
      throw error;
    }
  }

  async sendBatch(
    messages: Array<{ to: string; subject: string; body: string; html?: string }>
  ): Promise<void> {
    const results = await Promise.allSettled(
      messages.map(msg => this.send(msg.to, msg.subject, msg.body, msg.html))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      logger.error(`Batch email: ${failed.length}/${messages.length} messages failed`);
      if (failed.length === messages.length) {
        throw new Error('All batch email messages failed to send');
      }
    }
  }
}
