/**
 * Alerting Infrastructure
 * Handles critical error notifications and system alerts
 */

import { AppError, ErrorSeverity } from '../../domain/errors';
import { appLogger } from './logger';

export interface AlertConfig {
  enabled: boolean;
  channels: {
    console: boolean;
    webhook?: {
      url: string;
      headers?: Record<string, string>;
    };
    email?: {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      from: string;
      to: string[];
    };
  };
}

export interface Alert {
  id: string;
  severity: ErrorSeverity;
  title: string;
  message: string;
  timestamp: Date;
  context: {
    service: string;
    component?: string;
    operation?: string;
    error?: any;
    metadata?: Record<string, any>;
  };
}

export interface AlertResult {
  success: boolean;
  channel: string;
  error?: string;
}

/**
 * Alert Manager
 * Manages alert distribution and deduplication
 */
export class AlertManager {
  private static instance: AlertManager;
  private alerts = new Map<string, Alert>();
  private config: AlertConfig;

  private constructor(config: AlertConfig) {
    this.config = config;
  }

  static getInstance(config?: AlertConfig): AlertManager {
    if (!AlertManager.instance) {
      const defaultConfig: AlertConfig = {
        enabled: true,
        channels: {
          console: true,
        },
        ...config,
      };
      AlertManager.instance = new AlertManager(defaultConfig);
    }
    return AlertManager.instance;
  }

  /**
   * Send an alert through configured channels
   */
  async sendAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<AlertResult[]> {
    if (!this.config.enabled) {
      return [{ success: false, channel: 'disabled', error: 'Alerting disabled' }];
    }

    const fullAlert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      ...alert,
    };

    const results: AlertResult[] = [];

    // Send to all configured channels
    const channels = Object.keys(this.config.channels) as Array<keyof AlertConfig['channels']>;

    for (const channel of channels) {
      if (this.config.channels[channel]) {
        try {
          const result = await this.sendToChannel(channel as keyof AlertConfig['channels'], fullAlert);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            channel: channel as string,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Store alert for deduplication
    this.alerts.set(fullAlert.id, fullAlert);

    // Clean up old alerts (keep last 1000)
    if (this.alerts.size > 1000) {
      const oldestKey = this.alerts.keys().next().value;
      if (oldestKey) {
        this.alerts.delete(oldestKey);
      }
    }

    return results;
  }

  /**
   * Send critical error alert
   */
  async sendCriticalAlert(
    title: string,
    error: AppError | Error,
    context?: Record<string, any>
  ): Promise<AlertResult[]> {
    return this.sendAlert({
      severity: ErrorSeverity.CRITICAL,
      title,
      message: error.message,
      context: {
        service: 'order-service',
        component: 'system',
        operation: 'error-handling',
        error: error instanceof AppError ? {
          type: error.type,
          severity: error.severity,
          context: error.context,
        } : error,
        metadata: context,
      },
    });
  }

  /**
   * Send high priority alert
   */
  async sendHighAlert(
    title: string,
    message: string,
    context?: Record<string, any>
  ): Promise<AlertResult[]> {
    return this.sendAlert({
      severity: ErrorSeverity.HIGH,
      title,
      message,
      context: {
        service: 'order-service',
        component: 'system',
        metadata: context,
      },
    });
  }

  /**
   * Send medium priority alert
   */
  async sendMediumAlert(
    title: string,
    message: string,
    context?: Record<string, any>
  ): Promise<AlertResult[]> {
    return this.sendAlert({
      severity: ErrorSeverity.MEDIUM,
      title,
      message,
      context: {
        service: 'order-service',
        component: 'system',
        metadata: context,
      },
    });
  }

  /**
   * Check if similar alert was sent recently (within last 5 minutes)
   */
  isDuplicateAlert(alert: Omit<Alert, 'id' | 'timestamp'>, windowMs: number = 300000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const existingAlert of this.alerts.values()) {
      if (
        existingAlert.title === alert.title &&
        existingAlert.severity === alert.severity &&
        existingAlert.timestamp.getTime() > windowStart
      ) {
        return true;
      }
    }

    return false;
  }

  private async sendToChannel(channel: keyof AlertConfig['channels'], alert: Alert): Promise<AlertResult> {
    switch (channel) {
      case 'console':
        return this.sendToConsole(alert);
      case 'webhook':
        return this.sendToWebhook(alert);
      case 'email':
        return this.sendToEmail(alert);
      default:
        return { success: false, channel, error: `Unknown channel: ${channel}` };
    }
  }

  private async sendToConsole(alert: Alert): Promise<AlertResult> {
    const severityEmoji = {
      [ErrorSeverity.LOW]: 'ℹ️',
      [ErrorSeverity.MEDIUM]: '⚠️',
      [ErrorSeverity.HIGH]: '🚨',
      [ErrorSeverity.CRITICAL]: '💥',
    };

    console.error(`${severityEmoji[alert.severity]} ALERT: ${alert.title}`);
    console.error(`Message: ${alert.message}`);
    console.error(`Context:`, alert.context);
    console.error(`Time: ${alert.timestamp.toISOString()}`);

    return { success: true, channel: 'console' };
  }

  private async sendToWebhook(alert: Alert): Promise<AlertResult> {
    const webhookConfig = this.config.channels.webhook;
    if (!webhookConfig) {
      return { success: false, channel: 'webhook', error: 'Webhook not configured' };
    }

    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers,
        },
        body: JSON.stringify({
          alert,
          severity: alert.severity,
          timestamp: alert.timestamp.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      return { success: true, channel: 'webhook' };
    } catch (error) {
      return {
        success: false,
        channel: 'webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendToEmail(alert: Alert): Promise<AlertResult> {
    const emailConfig = this.config.channels.email;
    if (!emailConfig) {
      return { success: false, channel: 'email', error: 'Email not configured' };
    }

    // For now, just log that email would be sent
    // In production, integrate with nodemailer or similar
    console.log(`📧 EMAIL ALERT: Would send to ${emailConfig.to.join(', ')}`);
    console.log(`Subject: ${alert.severity.toUpperCase()}: ${alert.title}`);
    console.log(`Body: ${alert.message}`);

    return { success: true, channel: 'email' };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear all stored alerts
   */
  clearAlerts(): void {
    this.alerts.clear();
  }
}

// Global alert manager instance
export const alertManager = AlertManager.getInstance();

/**
 * Convenience functions for common alerts
 */
export async function alertCriticalError(title: string, error: AppError | Error, context?: Record<string, any>) {
  return alertManager.sendCriticalAlert(title, error, context);
}

export async function alertHighPriority(title: string, message: string, context?: Record<string, any>) {
  return alertManager.sendHighAlert(title, message, context);
}

export async function alertMediumPriority(title: string, message: string, context?: Record<string, any>) {
  return alertManager.sendMediumAlert(title, message, context);
}

/**
 * Auto-alert on critical errors
 * This function can be called from error handlers
 */
export async function handleCriticalError(error: AppError | Error, context?: Record<string, any>): Promise<void> {
  const title = error instanceof AppError
    ? `Critical ${error.type} Error`
    : 'Critical System Error';

  // Check for duplicate alerts
  if (alertManager.isDuplicateAlert({
    severity: ErrorSeverity.CRITICAL,
    title,
    message: error.message,
    context: { service: 'order-service', error, ...context },
  })) {
    appLogger.warn('Duplicate critical alert suppressed', { title, message: error.message });
    return;
  }

  const results = await alertCriticalError(title, error, context);

  // Log alert results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    appLogger.info(`Critical alert sent successfully to ${successful.length} channels`);
  }

  if (failed.length > 0) {
    appLogger.error(`Failed to send critical alert to ${failed.length} channels`, {
      failedChannels: failed.map(r => r.channel),
      errors: failed.map(r => r.error),
    });
  }
}

export default alertManager;
