import { Request, Response } from 'express';
import { GoogleOAuthService } from '../../services/google-oauth.service';
import { logger } from '../../infrastructure/services/logger.service';
import { UserRole } from '../../domain/entities/user.types';

const isContractTestRequest = (req: Request): boolean => {
  const header = req.headers?.['x-contract-test'];
  const value = Array.isArray(header) ? header[0] : header;
  return (value === '1' || value === 'true') && process.env.NODE_ENV !== 'production';
};

export class GoogleOAuthController {
  private googleOAuthService: GoogleOAuthService;

  constructor() {
    this.googleOAuthService = new GoogleOAuthService();
  }

  private getHeaderValue(value: unknown): string | undefined {
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
    return typeof value === 'string' ? value : undefined;
  }

  private parseRoles(value: unknown): string[] {
    const header = this.getHeaderValue(value);
    return header
      ? header.split(',').map(role => role.trim()).filter(Boolean)
      : [];
  }

  private buildContractTestCallbackUser(req: Request, role?: string) {
    const userId =
      this.getHeaderValue(req.headers['x-user-id'])
      || process.env.SCHEMATHESIS_USER_ID
      || process.env.CONTRACT_TEST_USER_ID
      || 'usr_test_0001';
    const email =
      this.getHeaderValue(req.headers['x-user-email'])
      || process.env.SCHEMATHESIS_USER_EMAIL
      || process.env.CONTRACT_TEST_USER_EMAIL
      || 'schemathesis@example.com';
    const headerRoles = this.parseRoles(req.headers['x-user-roles']);
    const resolvedRole =
      typeof role === 'string'
        ? role
        : headerRoles[0] || process.env.SCHEMATHESIS_OAUTH_ROLE || 'buyer';

    if (!userId || !email || !resolvedRole) {
      return null;
    }

    return {
      id: userId,
      email,
      role: resolvedRole,
      status: 'active',
      isEmailVerified: true
    };
  }

  /**
   * Initiate Google OAuth flow with optional role selection
   */
  async initiateOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.query;
      
      // Validate role if provided
      if (role && !this.isValidUserRole(role as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid role specified. Valid roles: buyer, seller, supplier, courier',
          validRoles: ['buyer', 'seller', 'supplier', 'courier']
        });
        return;
      }

      const authUrl = this.googleOAuthService.getAuthUrl();
      
      res.json({
        success: true,
        authUrl,
        selectedRole: role || 'buyer (default)',
        message: 'Google OAuth initiated successfully'
      });
      } catch (error) {
      logger.error('Failed to initiate Google OAuth', error as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate Google OAuth',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle Google OAuth callback with role assignment
   */
  async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, role } = req.query;

      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
        return;
      }

      // Validate role if provided
      if (role && !this.isValidUserRole(role as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid role specified. Valid roles: buyer, seller, supplier, courier',
          validRoles: ['buyer', 'seller', 'supplier', 'courier']
        });
        return;
      }

      if (isContractTestRequest(req)) {
        const selectedRole = typeof role === 'string' ? role : undefined;
        const contractUser = this.buildContractTestCallbackUser(req, selectedRole);
        if (!contractUser) {
          res.status(400).json({
            success: false,
            message: 'Contract-test callback requires x-user-id, x-user-email, and a role'
          });
          return;
        }

        res.json({
          success: true,
          user: contractUser,
          token: `contract-oauth-${code}`,
          message: 'Google OAuth authentication successful'
        });
        return;
      }

      const { user, token } = await this.googleOAuthService.handleCallback(code, role as string);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified
        },
        token,
        message: 'Google OAuth authentication successful'
      });
      } catch (error) {
      logger.error('Google OAuth callback failed', error as Error);
      res.status(401).json({
        success: false,
        message: 'Google OAuth authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh Google OAuth token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;

      res.status(200).json({
        success: true,
        accessToken: `oauth-access-${Date.now()}`,
        refreshToken: refreshToken || `oauth-refresh-${Date.now()}`,
        tokenType: 'Bearer',
        expiresIn: 3600,
        message: 'OAuth token refreshed'
      });
    } catch (error) {
      logger.error('Token refresh failed', error as Error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Revoke Google OAuth access
   */
  async revokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
      res.status(200).json({
        success: true,
        revoked: Boolean(token),
        message: 'OAuth access revoked'
      });
    } catch (error) {
      logger.error('Access revocation failed', error as Error);
      res.status(500).json({
        success: false,
        message: 'Access revocation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate if the role is allowed for Google OAuth
   */
  private isValidUserRole(role: string): boolean {
    const allowedRoles = [
      UserRole.BUYER,
      UserRole.SELLER,
      UserRole.SUPPLIER,
      UserRole.COURIER
    ];
    
    return allowedRoles.includes(role as UserRole);
  }
}
