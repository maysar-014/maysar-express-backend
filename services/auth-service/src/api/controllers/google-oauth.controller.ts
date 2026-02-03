import { Request, Response } from 'express';
import { GoogleOAuthService } from '../../services/google-oauth.service';
import { logger } from '../../infrastructure/services/logger.service';
import { UserRole } from '../../domain/entities/user.types';

export class GoogleOAuthController {
  private googleOAuthService: GoogleOAuthService;

  constructor() {
    this.googleOAuthService = new GoogleOAuthService();
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
      // This would need to be implemented based on your token refresh strategy
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: 'Token refresh not implemented yet'
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
      // This would need to be implemented based on your revocation strategy
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: 'Access revocation not implemented yet'
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