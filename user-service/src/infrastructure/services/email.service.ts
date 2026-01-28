import { DomainService } from '@domain/interfaces';

/**
 * Email Service Interface
 */
export interface EmailService extends DomainService {
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<void>;
  sendVerificationEmail(userEmail: string, verificationToken: string): Promise<void>;
  sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void>;
  sendWelcomeEmail(userEmail: string, userName: string): Promise<void>;
  sendSecurityAlert(userEmail: string, alertType: string, details: any): Promise<void>;
}

/**
 * Email Templates
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * In-Memory Email Service Implementation
 * For development and testing purposes
 */
export class InMemoryEmailService implements EmailService {
  public readonly name = 'InMemoryEmailService';
  private sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    sentAt: Date;
  }> = [];

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    // In development, we'll just log the email
    console.log(`📧 Email sent to ${to}: ${subject}`);
    console.log(`Content: ${html.substring(0, 100)}...`);
    
    this.sentEmails.push({
      to,
      subject,
      html,
      text,
      sentAt: new Date()
    } as any);
  }

  async sendVerificationEmail(userEmail: string, verificationToken: string): Promise<void> {
    const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Dear User,</p>
        <p>Thank you for registering with Maysar Marketplace. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>The Maysar Team</p>
      </div>
    `;

    await this.sendEmail(userEmail, 'Verify Your Email Address', html);
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Dear User,</p>
        <p>We received a request to reset your password. If you made this request, please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>For your security, please do not share this email with anyone.</p>
        <p>Best regards,<br>The Maysar Team</p>
      </div>
    `;

    await this.sendEmail(userEmail, 'Reset Your Password', html);
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Maysar Marketplace, ${userName}!</h2>
        <p>Dear ${userName},</p>
        <p>Welcome to Maysar, Tanzania's premier online marketplace! We're excited to have you on board.</p>
        
        <h3>What's Next?</h3>
        <ul>
          <li><strong>Complete your profile:</strong> Add a profile picture and bio to get started</li>
          <li><strong>Verify your email:</strong> Check your inbox for a verification email</li>
          <li><strong>Explore the marketplace:</strong> Browse products and services from local sellers</li>
          <li><strong>Start shopping or selling:</strong> Find great deals or list your own products</li>
        </ul>

        <h3>Need Help?</h3>
        <p>Our support team is here to help you every step of the way. Visit our Help Center or contact us directly.</p>
        
        <p>Thank you for choosing Maysar. We're committed to making your shopping and selling experience exceptional.</p>
        
        <p>Best regards,<br>The Maysar Team</p>
      </div>
    `;

    await this.sendEmail(userEmail, `Welcome to Maysar, ${userName}!`, html);
  }

  async sendSecurityAlert(userEmail: string, alertType: string, details: any): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Security Alert</h2>
        <p>Dear User,</p>
        <p>We've detected unusual activity on your Maysar account:</p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <strong>Alert Type:</strong> ${alertType}<br>
          <strong>Time:</strong> ${new Date().toLocaleString()}<br>
          <strong>Details:</strong> ${JSON.stringify(details, null, 2)}
        </div>

        <p><strong>What should you do?</strong></p>
        <ul>
          <li>Review your recent account activity</li>
          <li>Change your password if you suspect unauthorized access</li>
          <li>Enable two-factor authentication for added security</li>
          <li>Contact our support team if this wasn't you</li>
        </ul>

        <p>Your account security is our top priority. If you need assistance, please contact our security team immediately.</p>
        
        <p>Best regards,<br>The Maysar Security Team</p>
      </div>
    `;

    await this.sendEmail(userEmail, 'Security Alert - Unusual Activity Detected', html);
  }

  /**
   * Get sent emails for testing purposes
   */
  getSentEmails(): Array<{ to: string; subject: string; sentAt: Date }> {
    return this.sentEmails.map(email => ({
      to: email.to,
      subject: email.subject,
      sentAt: email.sentAt
    }));
  }

  /**
   * Clear sent emails for testing
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

/**
 * SMTP Email Service Implementation
 * For production use with SMTP providers
 */
export class SMTPService implements EmailService {
  public readonly name = 'SMTPService';
  
  // TODO: Implement SMTP integration
  // This would require setting up SMTP client and credentials
  // For now, we'll use the in-memory implementation as fallback

  private fallbackService: InMemoryEmailService;

  constructor() {
    this.fallbackService = new InMemoryEmailService();
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    // TODO: Implement SMTP send
    return this.fallbackService.sendEmail(to, subject, html, text);
  }

  async sendVerificationEmail(userEmail: string, verificationToken: string): Promise<void> {
    // TODO: Implement SMTP verification email
    return this.fallbackService.sendVerificationEmail(userEmail, verificationToken);
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
    // TODO: Implement SMTP password reset email
    return this.fallbackService.sendPasswordResetEmail(userEmail, resetToken);
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    // TODO: Implement SMTP welcome email
    return this.fallbackService.sendWelcomeEmail(userEmail, userName);
  }

  async sendSecurityAlert(userEmail: string, alertType: string, details: any): Promise<void> {
    // TODO: Implement SMTP security alert
    return this.fallbackService.sendSecurityAlert(userEmail, alertType, details);
  }
}