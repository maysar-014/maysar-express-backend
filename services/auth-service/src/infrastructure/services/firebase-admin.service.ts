/**
 * Firebase Admin Service
 * Singleton wrapper around firebase-admin for phone OTP token verification
 *
 * IMPORTANT: This file references Firebase ONLY as an example push/auth provider.
 * Maysar Express Backend is provider-agnostic — you can replace this
 * implementation with any other push/OTP provider (OneSignal, AWS SNS, Twilio,
 * self-hosted, etc.) by implementing the same interface. No provider is
 * mandated in system code.
 *
 * GRACEFUL DEGRADATION: When FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY /
 * FIREBASE_CLIENT_EMAIL are absent the service starts in stub mode.
 * All token verifications will fail with a clear PHONE_OTP_UNAVAILABLE error
 * instead of crashing the auth-service bootstrap.
 */

import * as admin from 'firebase-admin';

export interface IFirebaseAdminService {
  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
}

export class FirebaseAdminService implements IFirebaseAdminService {
  private static instance: FirebaseAdminService;
  private app: admin.app.App | null = null;
  private readonly configured: boolean;

  private constructor() {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    this.configured = !!(projectId && privateKey && clientEmail);

    if (this.configured) {
      try {
        if (admin.apps.length === 0) {
          this.app = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              privateKey,
              clientEmail,
            } as admin.ServiceAccount),
          });
        } else {
          this.app = admin.apps[0]!;
        }
      } catch (err: any) {
        // Firebase initialization can fail with credential validation errors —
        // log and degrade gracefully so auth-service still boots.
        console.warn('[FirebaseAdminService] Failed to initialize Firebase app — phone OTP disabled:', err?.message ?? err);
        this.app = null;
        (this as any).configured = false;
      }
    } else {
      console.warn(
        '[FirebaseAdminService] FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL not set ' +
        '— phone OTP verification unavailable. Set these env vars to enable phone verification.'
      );
    }
  }

  static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  /** Whether Firebase credentials are present and the app initialized successfully. */
  isConfigured(): boolean {
    return this.configured && this.app !== null;
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) {
      const err: any = new Error(
        'Phone OTP verification is not available — Firebase credentials are not configured.'
      );
      err.code = 'PHONE_OTP_UNAVAILABLE';
      throw err;
    }
    return admin.auth(this.app).verifyIdToken(idToken);
  }
}
