/**
 * In-app notification provider - storage and read tracking
 */

export interface IInAppProvider {
  create(userId: string, payload: { subject: string; body: string; data?: Record<string, any> }): Promise<string>;
  markAsRead(notificationId: string): Promise<void>;
}

export class InAppProviderAdapter implements IInAppProvider {
  async create(
    userId: string,
    payload: { subject: string; body: string; data?: Record<string, any> }
  ): Promise<string> {
    const id = `inapp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    if (process.env.NODE_ENV !== 'test') {
      console.debug('InAppProvider.create', { userId, id });
    }
    return id;
  }

  async markAsRead(notificationId: string): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.debug('InAppProvider.markAsRead', { notificationId });
    }
  }
}
