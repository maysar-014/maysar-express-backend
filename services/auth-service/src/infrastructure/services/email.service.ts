import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger.service';

export interface IAuthEmailService {
  sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<void>;
}

export class AuthEmailService implements IAuthEmailService {
  private transporter?: Transporter;
  private fromAddress: string;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || (process.env.NODE_ENV !== 'production' ? 'localhost' : undefined);
    const smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    const fromAddress = process.env.SMTP_FROM || smtpUser || 'no-reply@maysar.co.tz';
    const fromName = process.env.SMTP_FROM_NAME || 'Maysar Digital Community';
    this.fromAddress = `${fromName} <${fromAddress}>`;

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure,
        ...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
        tls: { rejectUnauthorized: false }
      });
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<void> {
    const subject = 'Reset Your Password - Maysar';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a365d;">Password Reset Request</h2>
        <p>Dear User,</p>
        <p>We received a request to reset your password for your Maysar account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This link will expire in 30 minutes for security reasons.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Maysar Digital Community Trade Network</p>
      </div>
    `;
    const text = `Reset your password by opening this link: ${resetUrl}`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: email,
          subject,
          html,
          text
        });
        logger.info('[AuthEmailService] Password reset email sent via SMTP', { email, subject });
      } catch (err: any) {
        logger.error('[AuthEmailService] Failed to send password reset email via SMTP', { email, error: err?.message || err });
      }
    } else {
      logger.info('[AuthEmailService] SMTP not configured, logged email body', { email, resetUrl });
    }
  }
}
