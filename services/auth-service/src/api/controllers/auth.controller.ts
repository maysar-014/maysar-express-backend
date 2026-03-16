import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from '../../application/use-cases/authenticate-user.use-case';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly authenticateUserUseCase: AuthenticateUserUseCase
  ) { }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, role, profile, phoneNumber, firstName, lastName } = req.body;
      const normalizedProfile: Record<string, any> = profile && typeof profile === 'object' ? { ...profile } : {};
      if (phoneNumber) normalizedProfile.phoneNumber = phoneNumber;
      if (firstName) normalizedProfile.firstName = firstName;
      if (lastName) normalizedProfile.lastName = lastName;
      if ((!normalizedProfile.firstName || !normalizedProfile.lastName) && typeof normalizedProfile.name === 'string') {
        const parts = normalizedProfile.name.trim().split(/\s+/);
        if (!normalizedProfile.firstName && parts[0]) normalizedProfile.firstName = parts[0];
        if (!normalizedProfile.lastName && parts.length > 1) {
          normalizedProfile.lastName = parts.slice(1).join(' ');
        }
      }
      const userId = await this.registerUserUseCase.execute({
        email,
        role: role || 'buyer',
        profile: normalizedProfile
      });
      res.json({ success: true, userId });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, totpCode } = req.body;
      const result = await this.authenticateUserUseCase.execute({
        email,
        password,
        totpCode,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });
      if (result.success) {
        const cookieOptions = {
          httpOnly: true,
          sameSite: 'strict' as const,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000
        };

        if (result.refreshToken) {
          res.cookie('refreshToken', result.refreshToken, cookieOptions);
        }

        // Remove refreshToken from response body if present
        const { refreshToken, ...responseBody } = result;
        res.json(responseBody);
      } else {
        res.status(401).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production'
    };
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('csrf-token');
    res.status(200).json({ success: true, message: 'Logged out' }); // Stub
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    res.status(501).json({ message: 'Not implemented' });
  }

  async verifySession(req: Request, res: Response): Promise<void> {
    res.status(200).json({ valid: true }); // Stub
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  }

  async enableTwoFactor(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  }

  async disableTwoFactor(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  }

  async verifyTwoFactorSetup(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  }

  async reportSuspiciousActivity(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true }); // Stub
  }

  async getAuthStats(req: Request, res: Response): Promise<void> {
    res.status(200).json({ activeUsers: 0 }); // Stub
  }
}
