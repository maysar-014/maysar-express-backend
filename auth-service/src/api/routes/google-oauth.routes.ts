import { Router } from 'express';
import { GoogleOAuthController } from '../controllers/google-oauth.controller';
import { logger } from '../../infrastructure/services/logger.service';

export class GoogleOAuthRoutes {
  private router: Router;
  private controller: GoogleOAuthController;

  constructor() {
    this.router = Router();
    this.controller = new GoogleOAuthController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Initiate Google OAuth flow
    this.router.get('/initiate', this.controller.initiateOAuth.bind(this.controller));

    // Handle Google OAuth callback
    this.router.get('/callback', this.controller.handleCallback.bind(this.controller));

    // Refresh OAuth token
    this.router.post('/refresh', this.controller.refreshToken.bind(this.controller));

    // Revoke OAuth access
    this.router.post('/revoke', this.controller.revokeAccess.bind(this.controller));

    logger.info('Google OAuth routes initialized');
  }

  getRouter(): Router {
    return this.router;
  }
}

// Export for use in main app
export const googleOAuthRoutes = new GoogleOAuthRoutes().getRouter();