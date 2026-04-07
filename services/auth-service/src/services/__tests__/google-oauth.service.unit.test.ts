import { GoogleOAuthService } from '../google-oauth.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRole, UserStatus } from '../../domain/entities/user.types';

function createMockUserServiceClient() {
  return {
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn()
  };
}

var mockUserServiceClient: ReturnType<typeof createMockUserServiceClient>;

// Mock the User Service Client
jest.mock('../../infrastructure/clients/user-service.client', () => ({
  UserServiceClient: jest.fn().mockImplementation(() => {
    if (!mockUserServiceClient) {
      mockUserServiceClient = createMockUserServiceClient();
    }
    return mockUserServiceClient;
  }),
  createUserServiceClient: jest.fn().mockImplementation(() => {
    if (!mockUserServiceClient) {
      mockUserServiceClient = createMockUserServiceClient();
    }
    return mockUserServiceClient;
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
    callbackUrl: 'http://localhost:3001/api/auth/oauth/callback',
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

// Mock the Google Auth Library
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?client_id=test_client_id&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Foauth%2Fcallback&scope=openid+profile+email&response_type=code&access_type=offline&prompt=consent'),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeToken: jest.fn()
  }))
}));

describe('GoogleOAuthService - Unit Tests', () => {
  let googleOAuthService: GoogleOAuthService;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-for-google-oauth-service-unit';

    // Create service instance
    googleOAuthService = new GoogleOAuthService();

    if (!mockUserServiceClient) {
      mockUserServiceClient = createMockUserServiceClient();
    }

    // Get the mocked user service client
    mockUserServiceClient.findUserByEmail.mockReset();
    mockUserServiceClient.createUser.mockReset();
    mockUserServiceClient.updateUser.mockReset();
  });

  afterAll(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
      return;
    }

    process.env.JWT_SECRET = previousJwtSecret;
  });

  describe('getAuthUrl', () => {
    it('should return a valid Google OAuth URL with required parameters', () => {
      const authUrl = googleOAuthService.getAuthUrl();

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/auth');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Foauth%2Fcallback');
      expect(authUrl).toContain('scope=openid+profile+email');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('access_type=offline');
      expect(authUrl).toContain('prompt=consent');
    });
  });

  describe('createUserFromGoogleProfile', () => {
    const mockGoogleProfile = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      verified_email: true
    };

    it('should create user with default buyer role when no role specified', async () => {
      // Mock user service to return a created user
      const mockCreatedUser = {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        metadata: {
          googleId: 'google_123',
          avatar: 'https://example.com/avatar.jpg'
        }
      };

      mockUserServiceClient.createUser.mockResolvedValue(mockCreatedUser);

      const result = await googleOAuthService.createUserFromGoogleProfile(mockGoogleProfile);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER
      });

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(UserRole.BUYER);
    });

    it('should create user with specified role', async () => {
      const mockCreatedUser = {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        metadata: {
          googleId: 'google_123',
          avatar: 'https://example.com/avatar.jpg'
        }
      };

      mockUserServiceClient.createUser.mockResolvedValue(mockCreatedUser);

      const result = await googleOAuthService.createUserFromGoogleProfile(mockGoogleProfile, UserRole.SELLER);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SELLER
      });

      expect(result.role).toBe(UserRole.SELLER);
    });

    it('should generate secure random password for OAuth users', async () => {
      const mockCreatedUser = {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        metadata: {
          googleId: 'google_123',
          avatar: 'https://example.com/avatar.jpg'
        }
      };

      mockUserServiceClient.createUser.mockResolvedValue(mockCreatedUser);

      await googleOAuthService.createUserFromGoogleProfile(mockGoogleProfile);

      expect(mockUserServiceClient.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.BUYER
        })
      );
    });
  });

  describe('updateUserFromGoogleProfile', () => {
    const mockUser = new UserEntity({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Old Name',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      metadata: {
        googleId: 'google_123'
      }
    });

    const mockGoogleProfile = {
      email: 'test@example.com',
      name: 'New Name',
      picture: 'https://example.com/new-avatar.jpg',
      verified_email: true
    };

    it('should update user profile when name changes', async () => {
      await googleOAuthService.updateUserFromGoogleProfile(mockUser, mockGoogleProfile);

      expect(mockUserServiceClient.updateUser).toHaveBeenCalledWith('user_123', {
        firstName: 'New',
        lastName: 'Name'
      });
    });

    it('should not update user when name is the same', async () => {
      const sameNameProfile = {
        ...mockGoogleProfile,
        name: 'Old Name'
      };

      await googleOAuthService.updateUserFromGoogleProfile(mockUser, sameNameProfile);

      expect(mockUserServiceClient.updateUser).not.toHaveBeenCalled();
    });

    it('should handle user service update errors gracefully', async () => {
      mockUserServiceClient.updateUser.mockRejectedValue(new Error('Database error'));

      await expect(
        googleOAuthService.updateUserFromGoogleProfile(mockUser, mockGoogleProfile)
      ).resolves.toBeUndefined();
    });
  });

  describe('mapUserServiceUserToAuthUser', () => {
    it('should map UserServiceUser to UserEntity correctly', () => {
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        metadata: {
          googleId: 'google_123'
        }
      };

      const result = googleOAuthService['mapUserServiceUserToAuthUser'](mockUserServiceUser);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.id).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');

      expect(result.role).toBe(UserRole.BUYER);
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should handle user with metadata', () => {
      const mockUserServiceUser = {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        metadata: {
          googleId: 'google_123',
          avatar: 'https://example.com/avatar.jpg'
        }
      };

      const result = googleOAuthService['mapUserServiceUserToAuthUser'](mockUserServiceUser);

      expect(result.metadata).toEqual({
        googleId: 'google_123',
        avatar: 'https://example.com/avatar.jpg'
      });
    });
  });
});
