import { Router } from 'express';
import { GoogleOAuthController } from '../controllers/google-oauth.controller';
import { validateRequest } from '../middleware/validation.middleware';
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
    // Public entry point: anyone can start OAuth here without auth or CSRF.
    this.router.get('/initiate', this.controller.initiateOAuth.bind(this.controller));

    // Handle Google OAuth callback
    this.router.get('/callback', this.controller.handleCallback.bind(this.controller));

    // Refresh OAuth token
    this.router.post(
      '/refresh',
      validateRequest({
        body: {
          refreshToken: { type: 'string', required: true, minLength: 1, pattern: /^[!-~]+$/ }
        }
      }),
      this.controller.refreshToken.bind(this.controller)
    );

    // Revoke OAuth access
    this.router.post(
      '/revoke',
      validateRequest({
        body: {
          token: { type: 'string', required: true, minLength: 1, pattern: /^[!-~]+$/ }
        }
      }),
      this.controller.revokeAccess.bind(this.controller)
    );

    logger.info('Google OAuth routes initialized');
  }

  getRouter(): Router {
    return this.router;
  }
}

// Factory used by the application bootstrap so the OAuth stack is only created
// after configuration validation has completed.
export const createGoogleOAuthRoutes = (): Router => new GoogleOAuthRoutes().getRouter();
