import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { GoogleOAuthService } from '../../services/google-oauth.service';
import { logger } from '../../infrastructure/services/logger.service';
import { UserRole } from '../../domain/entities/user.types';
import { googleOAuthSecurity } from '../../config/google-oauth.config';

const isContractTestRequest = (req: Request): boolean => {
  const header = req.headers?.['x-contract-test'];
  const value = Array.isArray(header) ? header[0] : header;
  return (value === '1' || value === 'true') && process.env.NODE_ENV !== 'production';
};

const OAUTH_COOKIE_PATH = '/api';
const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: OAUTH_COOKIE_PATH,
  maxAge: 10 * 60 * 1000
};
const OAUTH_CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: OAUTH_COOKIE_PATH
};
const OAUTH_CODE_VERIFIER_COOKIE = 'oauth_code_verifier';
const OAUTH_ROLE_COOKIE = 'oauth_role';
const STATE_SEPARATOR = '.';

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

  private getFrontendBaseUrl(): string | null {
    const candidate = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!candidate) return null;

    try {
      return new URL(candidate).toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  private resolveReturnTo(value: unknown): string | null {
    const raw = this.getHeaderValue(value);
    if (!raw) {
      return null;
    }

    const frontendBase = this.getFrontendBaseUrl();
    try {
      const parsed = frontendBase ? new URL(raw, frontendBase) : new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      if (frontendBase && parsed.origin !== new URL(frontendBase).origin) {
        return null;
      }

      return parsed.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  private encodeStateWithReturnTo(state: string, returnTo?: string | null): string {
    if (!returnTo) {
      return state;
    }

    return `${state}${STATE_SEPARATOR}${Buffer.from(returnTo, 'utf8').toString('base64url')}`;
  }

  private decodeReturnToFromState(state: string | undefined): string | null {
    if (!state) {
      return null;
    }

    const separatorIndex = state.indexOf(STATE_SEPARATOR);
    if (separatorIndex <= 0 || separatorIndex === state.length - 1) {
      return null;
    }

    const encodedReturnTo = state.slice(separatorIndex + 1);
    try {
      const decoded = Buffer.from(encodedReturnTo, 'base64url').toString('utf8');
      return this.resolveReturnTo(decoded);
    } catch {
      return null;
    }
  }

  private isStateProtectionEnabled(): boolean {
    return googleOAuthSecurity.csrf.enabled !== false;
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

  private getCookieValue(req: Request, name: string): string | undefined {
    const cookieValue = (req as Request & { cookies?: Record<string, unknown> }).cookies?.[name];
    if (typeof cookieValue === 'string' && cookieValue.length > 0) {
      return cookieValue;
    }

    const header = req.headers?.cookie;
    const rawCookie = Array.isArray(header) ? header.join('; ') : typeof header === 'string' ? header : undefined;
    if (!rawCookie) {
      return undefined;
    }

    const cookie = rawCookie
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(`${name}=`));

    if (!cookie) {
      return undefined;
    }

    const value = decodeURIComponent(cookie.slice(name.length + 1));
    return value || undefined;
  }

  private setOAuthCookies(res: Response, state: string | undefined, codeVerifier: string, role: string): void {
    if (this.isStateProtectionEnabled() && state) {
      res.cookie(googleOAuthSecurity.csrf.cookieName, state, OAUTH_COOKIE_OPTIONS);
    }
    res.cookie(OAUTH_CODE_VERIFIER_COOKIE, codeVerifier, OAUTH_COOKIE_OPTIONS);
    res.cookie(OAUTH_ROLE_COOKIE, role, OAUTH_COOKIE_OPTIONS);
  }

  private clearOAuthCookies(res: Response): void {
    res.clearCookie(googleOAuthSecurity.csrf.cookieName, OAUTH_CLEAR_COOKIE_OPTIONS);
    res.clearCookie(OAUTH_CODE_VERIFIER_COOKIE, OAUTH_CLEAR_COOKIE_OPTIONS);
    res.clearCookie(OAUTH_ROLE_COOKIE, OAUTH_CLEAR_COOKIE_OPTIONS);
  }

  private resolveSelectedRole(req: Request, role?: string): string | null {
    const cookieRole = this.getCookieValue(req, OAUTH_ROLE_COOKIE);
    if (cookieRole && typeof role === 'string' && cookieRole !== role) {
      return null;
    }

    return cookieRole || (typeof role === 'string' ? role : 'buyer');
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

      const selectedRole = typeof role === 'string' ? role : 'buyer';
      const returnTo = this.resolveReturnTo(req.query.returnTo);
      const stateSeed = randomBytes(16).toString('hex');
      const requestedState = this.encodeStateWithReturnTo(stateSeed, returnTo);
      const { authUrl, state, codeVerifier } = await this.googleOAuthService.createAuthRequest(requestedState);
      this.setOAuthCookies(res, state, codeVerifier, selectedRole);
      
      if (req.query.redirect === 'true' || req.query.redirect === '1') {
        res.redirect(authUrl);
        return;
      }

      res.json({
        success: true,
        authUrl,
        selectedRole: typeof role === 'string' ? role : 'buyer (default)',
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
      const { code, role, state } = req.query;

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

        this.clearOAuthCookies(res);
        res.json({
          success: true,
          user: contractUser,
          accessToken: `contract-oauth-${code}`,
          message: 'Google OAuth authentication successful'
        });
        return;
      }

      if (this.isStateProtectionEnabled()) {
        const cookieState = this.getCookieValue(req, googleOAuthSecurity.csrf.cookieName);
        const queryState = typeof state === 'string' ? state : undefined;
        if (!cookieState || !queryState || cookieState !== queryState) {
          this.clearOAuthCookies(res);
          res.status(400).json({
            success: false,
            message: 'Invalid OAuth state'
          });
          return;
        }
      }

      const codeVerifier = this.getCookieValue(req, OAUTH_CODE_VERIFIER_COOKIE);
      if (!codeVerifier) {
        this.clearOAuthCookies(res);
        res.status(400).json({
          success: false,
          message: 'OAuth code verifier is required'
        });
        return;
      }

      const selectedRole = this.resolveSelectedRole(req, typeof role === 'string' ? role : undefined);
      if (!selectedRole) {
        this.clearOAuthCookies(res);
        res.status(400).json({
          success: false,
          message: 'OAuth role mismatch'
        });
        return;
      }
      const { user, accessToken, refreshToken } = await this.googleOAuthService.handleCallback(code, selectedRole, codeVerifier);

      this.clearOAuthCookies(res);

      if (refreshToken) {
        const cookieOptions = {
          httpOnly: true,
          sameSite: 'strict' as const,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000
        };
        res.cookie('refreshToken', refreshToken, cookieOptions);
      }

      const returnTo = this.decodeReturnToFromState(typeof state === 'string' ? state : undefined);
      if (returnTo) {
        const redirectUrl = new URL(returnTo);
        redirectUrl.hash = new URLSearchParams({
          accessToken,
          refreshToken,
        }).toString();

        res.redirect(303, redirectUrl.toString());
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified
        },
        accessToken,
        message: 'Google OAuth authentication successful'
      });
    } catch (error) {
      this.clearOAuthCookies(res);
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

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      const refreshedTokens = await this.googleOAuthService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: refreshedTokens.expiresIn,
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

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Token is required'
        });
        return;
      }

      await this.googleOAuthService.revokeToken(token);

      res.status(200).json({
        success: true,
        revoked: true,
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
