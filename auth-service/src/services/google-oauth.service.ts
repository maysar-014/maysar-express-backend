import { OAuth2Client } from 'google-auth-library';
import { UserEntity } from '../domain/entities/user.entity';
import { UserServiceClient, createUserServiceClient } from '../infrastructure/clients/user-service.client';
import { authzConfigManager } from '../config/authorization.config';

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
  private userServiceClient: UserServiceClient;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    this.userServiceClient = createUserServiceClient();
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: process.env.GOOGLE_SCOPES?.split(' '),
      prompt: 'consent'
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

  private async createUserFromGoogleProfile(profile: GoogleUserProfile, role?: string): Promise<UserEntity> {
    const userData = {
      email: profile.email,
      password: this.generateRandomPassword(), // Generate temporary password for OAuth users
      role: role || 'buyer', // Default to buyer role if not specified
      firstName: profile.given_name,
      lastName: profile.family_name,
      // Note: other fields like phoneNumber, dateOfBirth are optional
    };

    const userServiceUser = await this.userServiceClient.createUser(userData);
    return this.mapUserServiceUserToAuthUser(userServiceUser);
  }

  private async updateUserFromGoogleProfile(user: UserEntity, profile: GoogleUserProfile): Promise<void> {
    // Update user profile with Google data
    const updates: any = {};
    
    if (profile.given_name && user.name !== `${profile.given_name} ${profile.family_name}`) {
      updates.firstName = profile.given_name;
      updates.lastName = profile.family_name;
    }
    
    if (Object.keys(updates).length > 0) {
      await this.userServiceClient.updateUser(user.id, updates);
    }
  }

  private mapUserServiceUserToAuthUser(userServiceUser: any): UserEntity {
    return new UserEntity({
      id: userServiceUser.id,
      email: userServiceUser.email,
      name: `${userServiceUser.firstName || ''} ${userServiceUser.lastName || ''}`.trim(),
      role: userServiceUser.role,
      status: userServiceUser.status,
      isEmailVerified: userServiceUser.isEmailVerified,
      isPhoneVerified: userServiceUser.isPhoneVerified,
      twoFactorEnabled: userServiceUser.twoFactorEnabled,
      twoFactorSecret: userServiceUser.twoFactorSecret,
      failedLoginAttempts: userServiceUser.failedLoginAttempts,
      lockoutUntil: userServiceUser.lockoutUntil ? new Date(userServiceUser.lockoutUntil) : undefined,
      lastLoginAt: userServiceUser.lastLoginAt ? new Date(userServiceUser.lastLoginAt) : undefined,
      createdAt: new Date(userServiceUser.createdAt),
      updatedAt: new Date(userServiceUser.updatedAt)
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
    // In a real implementation, you would use a proper JWT library like jsonwebtoken
    // For now, this is a placeholder that would need to be implemented properly
    // Example with jsonwebtoken library:
    // const jwt = require('jsonwebtoken');
    // return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    throw new Error('JWT implementation required - use jsonwebtoken library');
  }

  private getUserPermissions(user: UserEntity): string[] {
    // Get permissions from authz config manager
    const roleConfig = authzConfigManager.getRole(user.role);
    return roleConfig?.permissions?.map(p => `${p.resource}:${p.action}`) || [];
  }
}
