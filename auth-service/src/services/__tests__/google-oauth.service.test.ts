import { GoogleOAuthService } from '../google-oauth.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRole, UserStatus } from '../../domain/entities/user.types';

// Use real Google OAuth library for integration testing
import { OAuth2Client } from 'google-auth-library';

// Mock the User Service Client
jest.mock('../../infrastructure/clients/user-service.client', () => ({
  UserServiceClient: jest.fn().mockImplementation(() => ({
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn()
  })),
  createUserServiceClient: jest.fn().mockReturnValue({
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn()
  })
}));

// Mock the authz config manager
jest.mock('../../config/authorization.config', () => ({
  authzConfigManager: {
    getRole: jest.fn().mockReturnValue({
      permissions: [{ resource: 'user', action: 'read' }]
    })
  }
}));

// Mock the Google OAuth configuration
jest.mock('../../config/google-oauth.config', () => ({
  googleOAuthConfig: {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    callbackUrl: 'http://localhost:3001/auth/google/callback',
    scopes: ['openid', 'profile', 'email'],
    prompt: 'consent',
    accessType: 'offline',
    responseType: 'code',
    state: true,
    verificationEmail: true,
    allowedDomains: [],
    sessionTimeout: 3600000,
    maxRetries: 3,
    retryDelay: 1000
  }
}));

describe('GoogleOAuthService', () => {
  let googleOAuthService: GoogleOAuthService;
  let mockUserServiceClient: any;

  beforeEach(() => {
    googleOAuthService = new GoogleOAuthService();
    mockUserServiceClient = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should return a valid Google OAuth URL with required parameters', () => {
      const authUrl = googleOAuthService.getAuthUrl();
      
      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id');
      expect(authUrl).toContain('redirect_uri');
      expect(authUrl).toContain('scope');
      expect(authUrl).toContain('response_type');
      expect(authUrl).toContain('access_type');
      expect(authUrl).toContain('prompt');
    });
  });

  describe('handleCallback', () => {
    it('should handle valid authorization code and create new user', async () => {
      const mockCode = 'valid_auth_code';
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock user not found, then created
      mockUserServiceClient.findUserByEmail.mockResolvedValue(null);
      mockUserServiceClient.createUser.mockResolvedValue(mockUserServiceUser);

      const result = await googleOAuthService.handleCallback(mockCode);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String),
        role: UserRole.BUYER,
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should handle existing user and update profile when name changes', async () => {
      const mockCode = 'valid_auth_code';
      const mockExistingUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        firstName: 'Old',
        lastName: 'Name',
        avatar: 'https://example.com/old-avatar.jpg',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockUpdatedUser = {
        ...mockExistingUser,
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg'
      };

      // Mock existing user found
      mockUserServiceClient.findUserByEmail.mockResolvedValue(mockExistingUser);
      mockUserServiceClient.updateUser.mockResolvedValue(mockUpdatedUser);

      const result = await googleOAuthService.handleCallback(mockCode);

      expect(result).toHaveProperty('user');
      expect(result.user.name).toBe('Test User');
      expect(mockUserServiceClient.updateUser).toHaveBeenCalledWith('user_123', {
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should handle existing user and not update when name is the same', async () => {
      const mockCode = 'valid_auth_code';
      const mockExistingUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock existing user found
      mockUserServiceClient.findUserByEmail.mockResolvedValue(mockExistingUser);

      const result = await googleOAuthService.handleCallback(mockCode);

      expect(result).toHaveProperty('user');
      expect(result.user.name).toBe('Test User');
      expect(mockUserServiceClient.updateUser).not.toHaveBeenCalled();
    });

    it('should handle role parameter correctly when creating new user', async () => {
      const mockCode = 'valid_auth_code';
      const mockRole = 'seller';
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockUserServiceClient.findUserByEmail.mockResolvedValue(null);
      mockUserServiceClient.createUser.mockResolvedValue(mockUserServiceUser);

      const result = await googleOAuthService.handleCallback(mockCode, mockRole);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String),
        role: UserRole.SELLER,
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should handle authentication errors gracefully', async () => {
      const mockCode = 'invalid_auth_code';

      // Mock authentication error
      const { OAuth2Client } = require('google-auth-library');
      OAuth2Client.mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: jest.fn().mockRejectedValue(new Error('Invalid code')),
        setCredentials: jest.fn(),
        verifyIdToken: jest.fn()
      }));

      const newService = new GoogleOAuthService();

      await expect(newService.handleCallback(mockCode)).rejects.toThrow('Authentication failed');
    });

    it('should handle invalid Google token gracefully', async () => {
      const mockCode = 'valid_auth_code';

      // Mock invalid token
      const { OAuth2Client } = require('google-auth-library');
      OAuth2Client.mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            id_token: 'invalid_token',
            access_token: 'mock_access_token'
          }
        }),
        setCredentials: jest.fn(),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: jest.fn().mockReturnValue(null)
        })
      }));

      const newService = new GoogleOAuthService();

      await expect(newService.handleCallback(mockCode)).rejects.toThrow('Invalid Google token');
    });

    it('should handle user service errors gracefully', async () => {
      const mockCode = 'valid_auth_code';

      // Mock user service error
      mockUserServiceClient.findUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      await expect(googleOAuthService.handleCallback(mockCode)).rejects.toThrow('Authentication failed');
    });
  });

  describe('getUserProfile', () => {
    it('should extract user profile from valid token', async () => {
      const mockIdToken = 'valid_id_token';

      const result = await googleOAuthService['getUserProfile'](mockIdToken);

      expect(result).toEqual({
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      });
    });

    it('should handle invalid token format', async () => {
      const mockIdToken = 'invalid_token_format';

      await expect(googleOAuthService['getUserProfile'](mockIdToken)).rejects.toThrow();
    });
  });

  describe('createUserFromGoogleProfile', () => {
    it('should create user with default buyer role when no role specified', async () => {
      const mockProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      };

      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockUserServiceClient.createUser.mockResolvedValue(mockUserServiceUser);

      const result = await googleOAuthService['createUserFromGoogleProfile'](mockProfile);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String),
        role: UserRole.BUYER,
        firstName: 'Test',
        lastName: 'User'
      });
      expect(result.role).toBe(UserRole.BUYER);
    });

    it('should create user with specified role', async () => {
      const mockProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      };
      const mockRole = 'seller';

      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockUserServiceClient.createUser.mockResolvedValue(mockUserServiceUser);

      const result = await googleOAuthService['createUserFromGoogleProfile'](mockProfile, mockRole);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String),
        role: UserRole.SELLER,
        firstName: 'Test',
        lastName: 'User'
      });
      expect(result.role).toBe(UserRole.SELLER);
    });

    it('should generate secure random password for OAuth users', async () => {
      const mockProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      };

      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockUserServiceClient.createUser.mockResolvedValue(mockUserServiceUser);

      await googleOAuthService['createUserFromGoogleProfile'](mockProfile);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: expect.any(String),
          role: UserRole.BUYER,
          firstName: 'Test',
          lastName: 'User'
        })
      );

      const callArgs = mockUserServiceClient.createUser.mock.calls[0][0];
      expect(callArgs.password).toBeDefined();
      expect(callArgs.password.length).toBe(16);
      expect(typeof callArgs.password).toBe('string');
    });
  });

  describe('updateUserFromGoogleProfile', () => {
    it('should update user profile when name changes', async () => {
      const mockUser = new UserEntity({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Old Name',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const mockProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'New Name',
        given_name: 'New',
        family_name: 'Name',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      };

      await googleOAuthService['updateUserFromGoogleProfile'](mockUser, mockProfile);

      expect(mockUserServiceClient.updateUser).toHaveBeenCalledWith('user_123', {
        firstName: 'New',
        lastName: 'Name'
      });
    });

    it('should not update user when name is the same', async () => {
      const mockUser = new UserEntity({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const mockProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      };

      await googleOAuthService['updateUserFromGoogleProfile'](mockUser, mockProfile);

      expect(mockUserServiceClient.updateUser).not.toHaveBeenCalled();
    });

    it('should handle user service update errors gracefully', async () => {
      const mockUser = new UserEntity({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Old Name',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const mockProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'New Name',
        given_name: 'New',
        family_name: 'Name',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en'
      };

      mockUserServiceClient.updateUser.mockRejectedValue(new Error('Database update failed'));

      // Should not throw, just log the error
      await expect(googleOAuthService['updateUserFromGoogleProfile'](mockUser, mockProfile)).resolves.toBeUndefined();
    });
  });

  describe('mapUserServiceUserToAuthUser', () => {
    it('should map UserServiceUser to UserEntity correctly', () => {
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: 'buyer',
        status: 'active',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = googleOAuthService['mapUserServiceUserToAuthUser'](mockUserServiceUser);

      expect(result.id).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('buyer');
      expect(result.avatar).toBe('https://example.com/avatar.jpg');
      expect(result.metadata).toBeUndefined();
    });

    it('should handle user with metadata', () => {
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: 'buyer',
        status: 'active',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        metadata: { customField: 'value' },
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = googleOAuthService['mapUserServiceUserToAuthUser'](mockUserServiceUser);

      expect(result.metadata).toEqual({ customField: 'value' });
    });

    it('should handle user with missing optional fields', () => {
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: 'buyer',
        status: 'active',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = googleOAuthService['mapUserServiceUserToAuthUser'](mockUserServiceUser);

      expect(result.id).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('buyer');
      expect(result.avatar).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate a secure random password', () => {
      const password = googleOAuthService['generateRandomPassword']();
      
      expect(password).toBeDefined();
      expect(password.length).toBe(16);
      expect(typeof password).toBe('string');
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = googleOAuthService['generateRandomPassword']();
      const password2 = googleOAuthService['generateRandomPassword']();
      
      expect(password1).not.toBe(password2);
    });

    it('should generate password with mixed character types', () => {
      const password = googleOAuthService['generateRandomPassword']();
      
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });
  });

  describe('generateAuthToken', () => {
    it('should throw error for JWT implementation', () => {
      const mockUser = new UserEntity({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(() => googleOAuthService['generateAuthToken'](mockUser))
        .toThrow('JWT implementation required - use jsonwebtoken library');
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions based on user role', () => {
      const mockUser = new UserEntity({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const permissions = googleOAuthService['getUserPermissions'](mockUser);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions[0]).toBe('user:read');
    });

    it('should return empty permissions for unknown role', () => {
      const mockUser = new UserEntity({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'unknown_role' as UserRole,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const permissions = googleOAuthService['getUserPermissions'](mockUser);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBe(0);
    });
  });
});
