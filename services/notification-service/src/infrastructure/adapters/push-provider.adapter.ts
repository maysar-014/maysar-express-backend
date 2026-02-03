/**
 * Push notification provider - Firebase/OneSignal
 */

export interface IPushProvider {
  send(deviceToken: string, payload: { title?: string; body?: string; data?: Record<string, any> }): Promise<void>;
  sendBatch(
    items: Array<{
      deviceToken: string;
      payload: { title?: string; body?: string; data?: Record<string, any> };
    }>
  ): Promise<void>;
}

export class PushProviderAdapter implements IPushProvider {
  constructor(private config?: { projectId?: string; privateKey?: string }) {}

  async send(
    deviceToken: string,
    payload: { title?: string; body?: string; data?: Record<string, any> }
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.debug('PushProvider.send', { deviceToken: deviceToken.substring(0, 20) });
    }
  }

  async sendBatch(
    items: Array<{
      deviceToken: string;
      payload: { title?: string; body?: string; data?: Record<string, any> };
    }>
  ): Promise<void> {
    for (const item of items) {
      await this.send(item.deviceToken, item.payload);
    }
  }
}
