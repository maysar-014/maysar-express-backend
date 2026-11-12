/**
 * Firebase Admin Service
 * Singleton wrapper around firebase-admin for phone OTP token verification
 *
 * IMPORTANT: This file references Firebase ONLY as an example push/auth provider.
 * Maysar Express Backend is provider-agnostic — you can replace this
 * implementation with any other push/OTP provider (OneSignal, AWS SNS, Twilio,
 * self-hosted, etc.) by implementing the same interface. No provider is
 * mandated in system code.
 */

import * as admin from 'firebase-admin';

export interface IFirebaseAdminService {
  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
}

export class FirebaseAdminService implements IFirebaseAdminService {
  private static instance: FirebaseAdminService;
  private app: admin.app.App;

  private constructor() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        } as admin.ServiceAccount)
      });
    } else {
      this.app = admin.apps[0]!;
    }
  }

  static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth(this.app).verifyIdToken(idToken);
  }
}
