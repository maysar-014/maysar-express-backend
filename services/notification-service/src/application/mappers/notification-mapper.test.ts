import { NotificationMapper } from './notification-mapper';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { isSystemId } from '@shared/ids/id';

describe('NotificationMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps create-notification dto to entity and persistence payload', () => {
    const entity = NotificationMapper.toEntity({
      userId: 'user-1',
      type: 'email',
      channel: 'email',
      subject: 'Welcome',
      content: 'Welcome to Maysar',
      contentHtml: '<p>Welcome to Maysar</p>',
      priority: 'high',
      metadata: { campaign: 'onboarding', retries: 0 },
      deliveryAddress: 'user@example.com',
      deliveryAddressType: 'email'
    });

    expect(isSystemId(entity.id)).toBe(true);
    expect(entity.userId).toBe('user-1');
    expect(entity.content.getValue()).toBe('Welcome to Maysar');
    expect(entity.deliveryAddress?.getValue()).toBe('user@example.com');
    expect(entity.deliveryAddress?.getType()).toBe('email');

    const persistence = NotificationMapper.toPersistence(entity);
    expect(persistence).toEqual(
      expect.objectContaining({
        id: entity.id,
        subject: 'Welcome',
        content: 'Welcome to Maysar',
        contentHtml: '<p>Welcome to Maysar</p>',
        deliveryAddress: 'user@example.com',
        deliveryAddressType: 'email'
      })
    );
  });

  it('maps notification entity to response and summary DTOs', () => {
    const entity = NotificationMapper.toEntity({
      userId: 'user-2',
      type: 'sms',
      channel: 'sms',
      subject: 'OTP',
      content: 'Your OTP is 123456',
      metadata: { category: 'transactional' }
    });

    const response = NotificationMapper.toResponseDto(entity);
    const summary = NotificationMapper.toSummaryDto(entity);

    expect(response).toEqual(
      expect.objectContaining({
        id: entity.id,
        userId: 'user-2',
        channel: 'sms',
        content: 'Your OTP is 123456'
      })
    );
    expect(summary).toEqual(
      expect.objectContaining({
        id: entity.id,
        status: entity.status,
        subject: 'OTP'
      })
    );
  });

  it('maps template DTOs to template entity and response DTO', () => {
    const template = NotificationMapper.templateToEntity({
      name: 'Order Paid',
      type: 'transactional',
      channel: 'email',
      subject: 'Order {{orderId}} paid',
      bodyTemplate: 'Hello {{name}}, your order {{orderId}} was paid.',
      createdBy: 'system'
    });

    const response = NotificationMapper.templateToResponseDto(template);
    expect(response).toEqual(
      expect.objectContaining({
        id: template.id,
        name: 'Order Paid',
        channel: 'email',
        createdBy: 'system',
        isActive: true
      })
    );
    expect(response.variables).toEqual(expect.arrayContaining(['name', 'orderId']));
  });

  it('maps preference entity and applies preference updates from DTO', () => {
    const preference = NotificationPreference.create({
      id: 'pref-1',
      userId: 'user-3',
      channel: 'push',
      enabled: true,
      categories: { marketing: true, transactional: true, system: true }
    });

    const response = NotificationMapper.preferenceToResponseDto(preference);
    expect(response).toEqual(
      expect.objectContaining({
        id: 'pref-1',
        userId: 'user-3',
        channel: 'push',
        enabled: true
      })
    );

    const updated = NotificationMapper.preferenceUpdateFromDto(preference, {
      enabled: false,
      categories: { marketing: false },
      frequency: 'daily'
    } as never);

    expect(updated.enabled).toBe(false);
    expect(updated.categories.marketing).toBe(false);
    expect(updated.frequency).toBe('daily');
  });
});
