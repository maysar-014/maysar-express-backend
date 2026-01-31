import { DomainService } from '../interfaces';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { DeliveryAddress } from '../value-objects/delivery-address.value-object';

/**
 * Notification Validation Service
 * Pure validation logic (no infrastructure dependencies)
 */
export class NotificationValidationService implements DomainService {
  public readonly name = 'NotificationValidationService';

  validateNotification(notification: Notification): { isValid: boolean; errors: string[] } {
    const result = notification.validate();
    if (!result.isValid) return result;
    if (notification.deliveryAddress && !notification.deliveryAddress.isValid()) {
      result.errors.push('Invalid delivery address');
      result.isValid = false;
    }
    return result;
  }

  validateTemplate(template: NotificationTemplate): { isValid: boolean; errors: string[] } {
    return template.validate();
  }

  validateDeliveryAddress(
    address: DeliveryAddress,
    channel: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!address.isValid()) errors.push('Invalid delivery address');
    const type = address.getType();
    const validChannels: Record<string, string[]> = {
      email: ['email'],
      sms: ['phone'],
      push: ['device_token'],
      'in-app': ['device_token', 'email']
    };
    const allowed = validChannels[channel];
    if (allowed && !allowed.includes(type)) {
      errors.push(`Channel ${channel} does not support address type ${type}`);
    }
    return { isValid: errors.length === 0, errors };
  }
}
