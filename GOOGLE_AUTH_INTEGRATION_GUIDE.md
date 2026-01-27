# Google Authentication Integration Guide

This guide provides step-by-step instructions for integrating Google OAuth 2.0 authentication into the Maysar API Gateway system.

## Overview

The integration follows the Gateway Auth Separation Plan architecture, where authentication is delegated to the Auth Service. Google OAuth will be implemented in the Auth Service, and the Gateway will use the existing auth delegation middleware to handle Google authentication flows.

## Architecture

```
Client → API Gateway → Auth Service → Google OAuth
```

- **API Gateway**: Handles authentication delegation using existing middleware
- **Auth Service**: Implements Google OAuth 2.0 flow and token management
- **Google OAuth**: Provides identity verification and access tokens

## Prerequisites

### Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API (or Google People API for profile access)

2. **Configure OAuth Consent Screen**
   - Navigate to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in application information:
     - App name: "Maysar"
     - User support email: your support email
     - Developer contact email: your email
   - Add scopes: `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`
   - Save and submit for verification (if required)

3. **Create OAuth 2.0 Credentials**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Maysar Auth Service"
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/auth/google/callback`
   - Save and note the Client ID and Client Secret

## Implementation

### 1. Auth Service Configuration

#### Environment Variables

Add to `auth-service/.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile
```

#### Google OAuth Service

Create `auth-service/src/services/google-oauth.service.ts`:

```typescript
import { OAuth2Client } from 'google-auth-library';
import { User } from '../domain/entities/user.entity';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { AuthConfig } from './auth.config';

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;
  private userRepository: UserRepository;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    this.userRepository = new UserRepository();
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: process.env.GOOGLE_SCOPES?.split(' '),
      prompt: 'consent'
    });
  }

  async handleCallback(code: string): Promise<{ user: User; token: string }> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user profile
      const userProfile = await this.getUserProfile(tokens.id_token!);

      // Find or create user in database
      let user = await this.userRepository.findByEmail(userProfile.email);
      
      if (!user) {
        user = await this.createUserFromGoogleProfile(userProfile);
      } else {
        // Update user profile if needed
        await this.updateUserFromGoogleProfile(user, userProfile);
      }

      // Generate JWT token
      const token = this.generateAuthToken(user);

      return { user, token };

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Authentication failed');
    }
  }

  private async getUserProfile(idToken: string): Promise<GoogleUserProfile> {
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token');
    }

    return {
      id: payload.sub!,
      email: payload.email!,
      verified_email: payload.email_verified!,
      name: payload.name!,
      given_name: payload.given_name!,
      family_name: payload.family_name!,
      picture: payload.picture!,
      locale: payload.locale!,
    };
  }

  private async createUserFromGoogleProfile(profile: GoogleUserProfile): Promise<User> {
    const userData = {
      email: profile.email,
      name: profile.name,
      googleId: profile.id,
      avatar: profile.picture,
      emailVerified: profile.verified_email,
      role: 'user', // Default role
      status: 'active',
      metadata: {
        googleProfile: {
          id: profile.id,
          verified: profile.verified_email,
          locale: profile.locale,
        }
      }
    };

    return await this.userRepository.create(userData);
  }

  private async updateUserFromGoogleProfile(user: User, profile: GoogleUserProfile): Promise<void> {
    if (user.name !== profile.name || user.avatar !== profile.picture) {
      await this.userRepository.update(user.id, {
        name: profile.name,
        avatar: profile.picture,
        emailVerified: profile.verified_email,
        metadata: {
          ...user.metadata,
          googleProfile: {
            id: profile.id,
            verified: profile.verified_email,
            locale: profile.locale,
            lastSync: new Date().toISOString(),
          }
        }
      });
    }
  }

  private generateAuthToken(user: User): string {
    // Use existing JWT generation logic
    return this.config.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user),
    });
  }

  private getUserPermissions(user: User): string[] {
    // Implement based on your permission system
    return ['read:profile', 'update:profile'];
  }
}
```

#### Google OAuth Controller

Create `auth-service/src/api/controllers/google-oauth.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { AuthConfig } from '../services/auth.config';

export class GoogleOAuthController {
  private googleOAuthService: GoogleOAuthService;

  constructor() {
    this.googleOAuthService = new GoogleOAuthService(new AuthConfig());
  }

  async initiateAuth(req: Request, res: Response): Promise<void> {
    try {
      const authUrl = this.googleOAuthService.getAuthUrl();
      res.json({
        success: true,
        data: {
          authUrl,
          message: 'Redirect user to this URL to authenticate with Google'
        }
      });
    } catch (error) {
      console.error('Google OAuth initiation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GOOGLE_OAUTH_ERROR',
          message: 'Failed to initiate Google authentication'
        }
      });
    }
  }

  async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CALLBACK',
            message: 'Authorization code not provided'
          }
        });
      }

      const { user, token } = await this.googleOAuthService.handleCallback(code as string);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
          },
          token,
          message: 'Google authentication successful'
        }
      });

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.status(401).json({
        success: false,
        error: {
          code: 'GOOGLE_AUTH_FAILED',
          message: 'Google authentication failed'
        }
      });
    }
  }

  async linkGoogleAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).auth.userId;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Authorization code not provided'
          }
        });
      }

      const { tokens } = await this.googleOAuthService.oauth2Client.getToken(code as string);
      const userProfile = await this.googleOAuthService.getUserProfile(tokens.id_token!);

      // Link Google account to existing user
      await this.googleOAuthService.userRepository.update(userId, {
        googleId: userProfile.id,
        metadata: {
          ...((await this.googleOAuthService.userRepository.findById(userId))?.metadata || {}),
          googleLinked: true,
          googleProfile: userProfile
        }
      });

      res.json({
        success: true,
        data: {
          message: 'Google account linked successfully'
        }
      });

    } catch (error) {
      console.error('Google account linking error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GOOGLE_LINK_FAILED',
          message: 'Failed to link Google account'
        }
      });
    }
  }

  async unlinkGoogleAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).auth.userId;

      await this.googleOAuthService.userRepository.update(userId, {
        googleId: null,
        metadata: {
          ...((await this.googleOAuthService.userRepository.findById(userId))?.metadata || {}),
          googleLinked: false,
          googleProfile: null
        }
      });

      res.json({
        success: true,
        data: {
          message: 'Google account unlinked successfully'
        }
      });

    } catch (error) {
      console.error('Google account unlinking error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GOOGLE_UNLINK_FAILED',
          message: 'Failed to unlink Google account'
        }
      });
    }
  }
}
```

#### Google OAuth Routes

Add to `auth-service/src/api/routes/google-oauth.routes.ts`:

```typescript
import { Router } from 'express';
import { GoogleOAuthController } from '../controllers/google-oauth.controller';
import { authDelegationMiddleware } from '../../api-gateway/src/middleware/auth-delegation.middleware';

const router = Router();
const controller = new GoogleOAuthController();

// Public routes
router.get('/auth/google', controller.initiateAuth.bind(controller));
router.get('/auth/google/callback', controller.handleCallback.bind(controller));

// Protected routes (require authentication)
router.post('/auth/google/link', 
  authDelegationMiddleware.middleware({ required: true }),
  controller.linkGoogleAccount.bind(controller)
);

router.delete('/auth/google/unlink',
  authDelegationMiddleware.middleware({ required: true }),
  controller.unlinkGoogleAccount.bind(controller)
);

export default router;
```

### 2. API Gateway Integration

#### Update Auth Delegation Service

Modify `api-gateway/src/services/auth-delegation.service.ts` to support Google OAuth:

```typescript
// Add Google OAuth methods to AuthDelegationService

async initiateGoogleAuth(): Promise<{ authUrl: string }> {
  try {
    const response = await this.httpClient.get('/auth/google');
    return response.data.data;
  } catch (error) {
    console.error('Google Auth initiation error:', error);
    throw new Error('Failed to initiate Google authentication');
  }
}

async handleGoogleCallback(code: string): Promise<{ user: any; token: string }> {
  try {
    const response = await this.httpClient.get('/auth/google/callback', {
      params: { code }
    });
    return response.data.data;
  } catch (error) {
    console.error('Google Auth callback error:', error);
    throw new Error('Google authentication failed');
  }
}

async linkGoogleAccount(token: string, code: string): Promise<{ message: string }> {
  try {
    const response = await this.httpClient.post('/auth/google/link', 
      { code }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error('Google account linking error:', error);
    throw new Error('Failed to link Google account');
  }
}

async unlinkGoogleAccount(token: string): Promise<{ message: string }> {
  try {
    const response = await this.httpClient.delete('/auth/google/unlink', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Google account unlinking error:', error);
    throw new Error('Failed to unlink Google account');
  }
}
```

#### Google OAuth Middleware

Create `api-gateway/src/middleware/google-oauth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthDelegationService } from '../services/auth-delegation.service';

export interface GoogleOAuthOptions {
  required?: boolean;
  autoLink?: boolean;
}

export class GoogleOAuthMiddleware {
  private authDelegationService: AuthDelegationService;

  constructor() {
    this.authDelegationService = new AuthDelegationService();
  }

  initiateAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { authUrl } = await this.authDelegationService.initiateGoogleAuth();
        res.json({
          success: true,
          data: {
            authUrl,
            message: 'Redirect user to this URL to authenticate with Google'
          }
        });
      } catch (error) {
        console.error('Google OAuth initiation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'GOOGLE_OAUTH_ERROR',
            message: 'Failed to initiate Google authentication'
          }
        });
      }
    };
  }

  handleCallback() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { code } = req.query;
        
        if (!code) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_CALLBACK',
              message: 'Authorization code not provided'
            }
          });
        }

        const { user, token } = await this.authDelegationService.handleGoogleCallback(code as string);

        // Set authentication context
        (req as any).auth = {
          userId: user.id,
          email: user.email,
          role: user.role,
          authenticated: true,
        };

        res.json({
          success: true,
          data: {
            user,
            token,
            message: 'Google authentication successful'
          }
        });

      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.status(401).json({
          success: false,
          error: {
            code: 'GOOGLE_AUTH_FAILED',
            message: 'Google authentication failed'
          }
        });
      }
    };
  }

  linkGoogleAccount() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        const { code } = req.body;

        if (!token) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication token required'
            }
          });
        }

        if (!code) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Authorization code not provided'
            }
          });
        }

        const result = await this.authDelegationService.linkGoogleAccount(token, code as string);

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        console.error('Google account linking error:', error);
        res.status(400).json({
          success: false,
          error: {
            code: 'GOOGLE_LINK_FAILED',
            message: 'Failed to link Google account'
          }
        });
      }
    };
  }

  unlinkGoogleAccount() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication token required'
            }
          });
        }

        const result = await this.authDelegationService.unlinkGoogleAccount(token);

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        console.error('Google account unlinking error:', error);
        res.status(400).json({
          success: false,
          error: {
            code: 'GOOGLE_UNLINK_FAILED',
            message: 'Failed to unlink Google account'
          }
        });
      }
    };
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}

// Export middleware instance and functions
export const googleOAuthMiddleware = new GoogleOAuthMiddleware();

export const initiateGoogleAuth = googleOAuthMiddleware.initiateAuth();
export const handleGoogleCallback = googleOAuthMiddleware.handleCallback();
export const linkGoogleAccount = googleOAuthMiddleware.linkGoogleAccount();
export const unlinkGoogleAccount = googleOAuthMiddleware.unlinkGoogleAccount();
```

#### Update Gateway Routes

Add to `api-gateway/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import { initiateGoogleAuth, handleGoogleCallback, linkGoogleAccount, unlinkGoogleAccount } from '../middleware/google-oauth.middleware';

const router = Router();

// Google OAuth routes
router.get('/auth/google', initiateGoogleAuth);
router.get('/auth/google/callback', handleGoogleCallback);
router.post('/auth/google/link', linkGoogleAccount);
router.delete('/auth/google/unlink', unlinkGoogleAccount);

export default router;
```

### 3. Frontend Integration

#### React Hook for Google Auth

Create `frontend/src/hooks/useGoogleAuth.ts`:

```typescript
import { useState, useCallback } from 'react';

interface GoogleAuthState {
  loading: boolean;
  error: string | null;
  user: any | null;
  token: string | null;
}

export const useGoogleAuth = () => {
  const [state, setState] = useState<GoogleAuthState>({
    loading: false,
    error: null,
    user: null,
    token: null,
  });

  const initiateGoogleAuth = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/google', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect user to Google auth URL
        window.location.href = data.data.authUrl;
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error.message 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to initiate Google authentication' 
      }));
    }
  }, []);

  const handleGoogleCallback = useCallback(async (code: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/auth/google/callback?code=${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          user: data.data.user, 
          token: data.data.token 
        }));
        
        // Store token in localStorage or context
        localStorage.setItem('authToken', data.data.token);
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error.message 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Google authentication failed' 
      }));
    }
  }, []);

  const linkGoogleAccount = useCallback(async (code: string, token: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error.message 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to link Google account' 
      }));
    }
  }, []);

  const unlinkGoogleAccount = useCallback(async (token: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/google/unlink', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error.message 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to unlink Google account' 
      }));
    }
  }, []);

  return {
    ...state,
    initiateGoogleAuth,
    handleGoogleCallback,
    linkGoogleAccount,
    unlinkGoogleAccount,
  };
};
```

#### React Component Example

Create `frontend/src/components/GoogleAuthButton.tsx`:

```typescript
import React from 'react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

interface GoogleAuthButtonProps {
  onAuthSuccess?: (user: any, token: string) => void;
  onError?: (error: string) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onAuthSuccess,
  onError,
}) => {
  const { 
    loading, 
    error, 
    initiateGoogleAuth, 
    handleGoogleCallback 
  } = useGoogleAuth();

  const handleGoogleLogin = async () => {
    try {
      await initiateGoogleAuth();
    } catch (err) {
      onError?.('Failed to initiate Google authentication');
    }
  };

  // Handle OAuth callback
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Remove code from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      handleGoogleCallback(code).then(() => {
        // Redirect to dashboard or home
        window.location.href = '/dashboard';
      });
    }
  }, [handleGoogleCallback]);

  return (
    <button 
      onClick={handleGoogleLogin}
      disabled={loading}
      className="google-auth-button"
    >
      {loading ? 'Loading...' : 'Sign in with Google'}
    </button>
  );
};
```

## Testing

### Unit Tests

Create `auth-service/src/services/__tests__/google-oauth.service.test.ts`:

```typescript
import { GoogleOAuthService } from '../google-oauth.service';
import { AuthConfig } from '../auth.config';

describe('GoogleOAuthService', () => {
  let googleOAuthService: GoogleOAuthService;

  beforeEach(() => {
    googleOAuthService = new GoogleOAuthService(new AuthConfig());
  });

  describe('getAuthUrl', () => {
    it('should return a valid Google OAuth URL', () => {
      const authUrl = googleOAuthService.getAuthUrl();
      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id');
    });
  });

  describe('handleCallback', () => {
    it('should handle valid authorization code', async () => {
      // Mock implementation
      const mockCode = 'valid_auth_code';
      const result = await googleOAuthService.handleCallback(mockCode);
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });
  });
});
```

### Integration Tests

Create `api-gateway/src/__tests__/integration/google-oauth.integration.test.ts`:

```typescript
import request from 'supertest';
import app from '../../app';

describe('Google OAuth Integration', () => {
  describe('GET /api/auth/google', () => {
    it('should return Google OAuth URL', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authUrl');
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should handle Google OAuth callback', async () => {
      const mockCode = 'valid_auth_code';
      
      const response = await request(app)
        .get(`/api/auth/google/callback?code=${mockCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });
  });
});
```

## Security Considerations

### 1. CSRF Protection

Implement state parameter validation:

```typescript
// In GoogleOAuthService
getAuthUrl(): string {
  const state = crypto.randomBytes(32).toString('hex');
  // Store state in session or cache
  return this.oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: process.env.GOOGLE_SCOPES?.split(' '),
    state: state,
    prompt: 'consent'
  });
}
```

### 2. Token Security

- Use HTTPS for all OAuth flows
- Set secure flags on cookies
- Implement proper token expiration
- Use refresh tokens appropriately

### 3. Data Privacy

- Only request necessary scopes
- Implement proper data handling
- Comply with GDPR/CCPA requirements
- Provide clear privacy policy

## Deployment

### Environment Configuration

Update deployment configurations:

```yaml
# docker-compose.yml
auth-service:
  environment:
    - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    - GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL}
    - GOOGLE_SCOPES=${GOOGLE_SCOPES}
```

### SSL/TLS

Ensure all OAuth endpoints use HTTPS:

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location /api/auth/google {
        proxy_pass http://auth-service:3001;
    }
}
```

## Monitoring and Logging

### Metrics

Track OAuth success/failure rates:

```typescript
// In GoogleOAuthService
private logOAuthEvent(event: string, userId?: string, error?: string) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: `google_oauth_${event}`,
    userId,
    error,
    service: 'auth-service'
  }));
}
```

### Error Handling

Implement comprehensive error handling:

```typescript
// Centralized error handling
const handleGoogleOAuthError = (error: any) => {
  if (error.code === 'invalid_grant') {
    return 'Invalid authorization code';
  }
  if (error.code === 'access_denied') {
    return 'User denied Google authentication';
  }
  return 'Google authentication failed';
};
```

## Troubleshooting

### Common Issues

1. **Invalid redirect URI**
   - Ensure callback URL matches Google Console configuration
   - Check for trailing slashes

2. **Scope permissions**
   - Verify required scopes are enabled in Google Console
   - Check user consent screen approval status

3. **Token validation errors**
   - Ensure JWT secret matches between services
   - Check token expiration settings

4. **CORS issues**
   - Configure proper CORS headers
   - Ensure frontend domain is whitelisted

### Debug Mode

Enable debug logging:

```env
# .env
DEBUG=google-oauth:*
LOG_LEVEL=debug
```

## Next Steps

1. **Production Deployment**
   - Set up proper SSL certificates
   - Configure load balancing
   - Implement monitoring

2. **Additional Features**
   - Social login for other providers (Facebook, Twitter)
   - Two-factor authentication integration
   - Account recovery flows

3. **Performance Optimization**
   - Implement caching for user profiles
   - Optimize database queries
   - Add rate limiting

This integration provides a complete Google OAuth 2.0 authentication flow that follows the Gateway Auth Separation Plan architecture and maintains proper service boundaries.