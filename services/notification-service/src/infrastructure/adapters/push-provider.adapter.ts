/**
 * Push notification provider - Firebase/OneSignal
 *
 * IMPORTANT: This file references Firebase ONLY as an example push provider.
 * Maysar Express Backend is provider-agnostic — you can replace this
 * implementation with any other push provider (OneSignal, AWS SNS, Twilio,
 * self-hosted, etc.) by implementing the IPushProvider interface. No provider
 * is mandated in system code.
 */

import admin from 'firebase-admin';

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
  private messaging?: admin.messaging.Messaging;

  /**
   * Firebase service-account configuration.
   *
   * `clientEmail` was previously read only from `FIREBASE_CLIENT_EMAIL`, so
   * `new PushProviderAdapter({ projectId, privateKey })` could never satisfy the
   * credential guard — the adapter would silently skip every push unless the
   * environment happened to supply the third value. All three parts of a service
   * account can now be injected directly, with the environment as fallback.
   */
  constructor(private config?: { projectId?: string; clientEmail?: string; privateKey?: string }) {}

  private ensureMessaging(): admin.messaging.Messaging | undefined {
    if (this.messaging) return this.messaging;

    const projectId = this.config?.projectId || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = this.config?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = this.config?.privateKey || process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : undefined;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!projectId || !clientEmail || !privateKey) {
      if (isProduction) {
        throw new Error('Firebase credentials are not configured for FCM');
      }
      if (process.env.NODE_ENV !== 'test') {
        console.warn('FCM not configured; push delivery skipped');
      }
      return undefined;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    }

    this.messaging = admin.messaging();
    return this.messaging;
  }

  async send(
    deviceToken: string,
    payload: { title?: string; body?: string; data?: Record<string, any> }
  ): Promise<void> {
    const messaging = this.ensureMessaging();
    if (!messaging) {
      return;
    }

    const data = payload.data
      ? Object.fromEntries(
          Object.entries(payload.data).map(([key, value]) => [key, String(value)])
        )
      : undefined;

    await messaging.send({
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data
    });
  }

  async sendBatch(
    items: Array<{
      deviceToken: string;
      payload: { title?: string; body?: string; data?: Record<string, any> };
    }>
  ): Promise<void> {
    const messaging = this.ensureMessaging();
    if (!messaging) {
      return;
    }

    const chunkSize = 500;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const messages = chunk.map((item) => {
        const data = item.payload.data
          ? Object.fromEntries(
              Object.entries(item.payload.data).map(([key, value]) => [key, String(value)])
            )
          : undefined;

        return {
          token: item.deviceToken,
          notification: {
            title: item.payload.title,
            body: item.payload.body
          },
          data
        };
      });

      await messaging.sendAll(messages);
    }
  }
}
