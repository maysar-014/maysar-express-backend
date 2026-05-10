/**
 * Firebase Admin Service
 * Singleton wrapper around firebase-admin for phone OTP token verification
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
