import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserEntity } from '../domain/entities/user.entity';
import { UserServiceClient, createUserServiceClient } from '../infrastructure/clients/user-service.client';
import { authzConfigManager } from '../config/authorization.config';
import { googleOAuthConfig } from '../config/google-oauth.config';

export interface GoogleUserProfile {
  id?: string;
  email: string;
  verified_email?: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;
  private userServiceClient: UserServiceClient;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      googleOAuthConfig.clientId,
      googleOAuthConfig.clientSecret,
      googleOAuthConfig.callbackUrl
    );
    this.userServiceClient = createUserServiceClient();
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: googleOAuthConfig.accessType,
      scope: googleOAuthConfig.scopes,
      prompt: googleOAuthConfig.prompt
    });
  }

  async handleCallback(code: string, role?: string): Promise<{ user: UserEntity; token: string }> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user profile
      const userProfile = await this.getUserProfile(tokens.id_token!);

      // Find or create user via User Service
      let user = await this.userServiceClient.findUserByEmail(userProfile.email);
      
      if (!user) {
        user = await this.createUserFromGoogleProfile(userProfile, role);
      } else {
        // Update user profile if needed
        await this.updateUserFromGoogleProfile(user, userProfile);
      }

      // Generate JWT token using authz config manager
      const token = this.generateAuthToken(user);

      return { user, token };

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Authentication failed');
    }
  }

  public async getUserProfile(idToken: string): Promise<GoogleUserProfile> {
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken,
      audience: googleOAuthConfig.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token');
    }

    return {
      id: payload.sub!,
      email: payload.email!,
      verified_email: payload.email_verified ?? true,
      name: payload.name!,
      given_name: payload.given_name ?? payload.name?.split(' ')[0] ?? '',
      family_name: payload.family_name ?? payload.name?.split(' ').slice(1).join(' ') ?? '',
      picture: payload.picture ?? '',
      locale: payload.locale ?? 'en',
    };
  }

  public async createUserFromGoogleProfile(profile: GoogleUserProfile, role?: string): Promise<UserEntity> {
    const firstName = profile.given_name ?? profile.name.split(' ')[0] ?? '';
    const lastName = profile.family_name ?? profile.name.split(' ').slice(1).join(' ') ?? '';
    const userData = {
      email: profile.email,
      password: this.generateRandomPassword(), // Generate temporary password for OAuth users
      role: role || 'buyer', // Default to buyer role if not specified
      firstName,
      lastName,
      // Note: other fields like phoneNumber, dateOfBirth are optional
    };

    const userServiceUser = await this.userServiceClient.createUser(userData);
    return this.mapUserServiceUserToAuthUser(userServiceUser);
  }

  public async updateUserFromGoogleProfile(user: UserEntity, profile: GoogleUserProfile): Promise<void> {
    // Update user profile with Google data
    const updates: any = {};
    const fullName = `${profile.given_name ?? profile.name.split(' ')[0] ?? ''} ${profile.family_name ?? profile.name.split(' ').slice(1).join(' ') ?? ''}`.trim();
    
    if (fullName && user.name !== fullName) {
      updates.firstName = profile.given_name ?? profile.name.split(' ')[0] ?? '';
      updates.lastName = profile.family_name ?? profile.name.split(' ').slice(1).join(' ') ?? '';
    }
    
    if (Object.keys(updates).length > 0) {
      await this.userServiceClient.updateUser(user.id, updates);
    }
  }

  private mapUserServiceUserToAuthUser(userServiceUser: any): UserEntity {
    return UserEntity.create({
      id: userServiceUser.id,
      publicCode: userServiceUser.publicCode,
      email: userServiceUser.email,
      name: `${userServiceUser.firstName || ''} ${userServiceUser.lastName || ''}`.trim(),
      role: userServiceUser.role,
      status: userServiceUser.status,
      avatar: userServiceUser.avatar,
      metadata: userServiceUser.metadata,
      profile: {
        name: `${userServiceUser.firstName || ''} ${userServiceUser.lastName || ''}`.trim(),
        avatar: userServiceUser.avatar,
        metadata: userServiceUser.metadata,
      },
      twoFactorEnabled: userServiceUser.twoFactorEnabled,
      twoFactorSecret: userServiceUser.twoFactorSecret,
      failedLoginAttempts: userServiceUser.failedLoginAttempts,
      createdAt: userServiceUser.createdAt ? new Date(userServiceUser.createdAt) : undefined,
    });
  }

  private generateRandomPassword(): string {
    // Generate a secure random password for OAuth users
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private generateAuthToken(user: UserEntity): string {
    // Use authz config manager to get permissions based on role
    const roleConfig = authzConfigManager.getRole(user.role);
    const permissions = roleConfig?.permissions || [];
    
    // Generate token with user context
    return this.createJWTToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: permissions.map(p => `${p.resource}:${p.action}`),
      // Note: googleId would need to be stored separately since it's not in AuthUser
    });
  }

  private createJWTToken(payload: any): string {
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn
    });
  }

  private getUserPermissions(user: UserEntity): string[] {
    // Get permissions from authz config manager
    const roleConfig = authzConfigManager.getRole(user.role);
    return roleConfig?.permissions?.map(p => `${p.resource}:${p.action}`) || [];
  }
}
