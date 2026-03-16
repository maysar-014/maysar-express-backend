import { Request, Response } from 'express';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { ChangePasswordUseCase } from '@application/use-cases/change-password.use-case';
import { DeleteAccountUseCase } from '@application/use-cases/delete-account.use-case';
import { SuspendAccountUseCase } from '@application/use-cases/suspend-account.use-case';
import { ChangeRoleUseCase } from '@application/use-cases/change-role.use-case';
import { VerifyPhoneUseCase } from '@application/use-cases/verify-phone.use-case';
import { SetupTwoFactorUseCase } from '@application/use-cases/setup-two-factor.use-case';
import { ReportSecurityBreachUseCase } from '@application/use-cases/report-security-breach.use-case';
import { GetUserUseCase } from '@application/use-cases/get-user.use-case';
import { UpdateUserUseCase } from '@application/use-cases/update-user.use-case';
import { VerifyEmailUseCase } from '@application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from '@application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@application/use-cases/reset-password.use-case';
import { UserMapper } from '@application/mappers/user-mapper';
import { UserAlreadyExistsError } from '@domain/errors/user.errors';
import { EmailService } from '@infrastructure/services/email.service';
import { NotificationServiceClient } from '@application/sagas/service-clients';

export class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private changePasswordUseCase: ChangePasswordUseCase,
    private deleteAccountUseCase: DeleteAccountUseCase,
    private suspendAccountUseCase: SuspendAccountUseCase,
    private changeRoleUseCase: ChangeRoleUseCase,
    private verifyPhoneUseCase: VerifyPhoneUseCase,
    private setupTwoFactorUseCase: SetupTwoFactorUseCase,
    private reportSecurityBreachUseCase: ReportSecurityBreachUseCase,
    private getUserUseCase: GetUserUseCase,
    private updateUserUseCase: UpdateUserUseCase,
    private verifyEmailUseCase: VerifyEmailUseCase,
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userDto = req.body;
      const createdUser = await this.createUserUseCase.execute(userDto);
      res.status(201).json({
        success: true,
        data: UserMapper.toResponseDto(createdUser),
        message: 'User created successfully'
      });
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred while creating the user'
          }
        });
      }
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const requestingUserId = req.headers['x-user-id'] as string;
      const result = await this.getUserUseCase.execute({ userId: id, requestingUserId });
      if (!result.success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: result.message
          }
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: UserMapper.toResponseDto(result.user!)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while retrieving the user'
        }
      });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const updatedBy = req.headers['x-user-id'] as string;
      const result = await this.updateUserUseCase.execute({ userId: id, updates: req.body, updatedBy });
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: result.message
          }
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: UserMapper.toResponseDto(result.user),
        changes: result.changes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while updating the user'
        }
      });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const deletedBy = req.headers['x-user-id'] as string;
      const result = await this.deleteAccountUseCase.execute({
        userId: id,
        deletedBy,
        reason: req.body.reason ?? 'User requested deletion'
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while deleting the user'
        }
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const verificationToken = req.params.token;
      const userId = req.body.userId ?? req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }
      const result = await this.verifyEmailUseCase.execute({ userId, verificationToken });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while verifying email'
        }
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const email = req.body.email;
      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required'
          }
        });
        return;
      }
      const result = await this.requestPasswordResetUseCase.execute({ email });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while requesting password reset'
        }
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.body.userId;
      const token = req.body.token;
      const newPassword = req.body.newPassword;
      if (!userId || !newPassword || !token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'User ID, token, and new password are required'
          }
        });
        return;
      }
      const result = await this.resetPasswordUseCase.execute({
        userId,
        token,
        newPassword
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while resetting password'
        }
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }
      const result = await this.getUserUseCase.execute({ userId, requestingUserId: userId });
      if (!result.success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: result.message
          }
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: UserMapper.toResponseDto(result.user!)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while retrieving user profile'
        }
      });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }
      const result = await this.updateUserUseCase.execute({ userId, updates: req.body, updatedBy: userId });
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: result.message
          }
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: UserMapper.toResponseDto(result.user)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while updating user profile'
        }
      });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!this.changePasswordUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const { id } = req.params;
      const result = await this.changePasswordUseCase.execute({
        userId: id,
        newPassword: req.body.newPassword,
        changedBy: req.headers['x-user-id'] as string,
        currentPassword: req.body.currentPassword
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!this.deleteAccountUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const { id } = req.params;
      const result = await this.deleteAccountUseCase.execute({
        userId: id,
        deletedBy: req.headers['x-user-id'] as string,
        reason: req.body.reason
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }

  async suspendAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!this.suspendAccountUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const { id } = req.params;
      const result = await this.suspendAccountUseCase.execute({
        userId: id,
        suspendedBy: req.headers['x-user-id'] as string,
        reason: req.body.reason,
        duration: req.body.duration
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }

  async changeRole(req: Request, res: Response): Promise<void> {
    try {
      if (!this.changeRoleUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const { id } = req.params;
      const result = await this.changeRoleUseCase.execute({
        userId: id,
        newRole: req.body.newRole,
        changedBy: req.headers['x-user-id'] as string
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }

  async verifyPhone(req: Request, res: Response): Promise<void> {
    try {
      if (!this.verifyPhoneUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const { id } = req.params;
      const result = await this.verifyPhoneUseCase.execute({
        userId: id,
        phoneNumber: req.body.phoneNumber,
        otp: req.body.otp,
        verificationMethod: req.body.verificationMethod || 'otp'
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }

  async setupTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      if (!this.setupTwoFactorUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const { id } = req.params;
      const result = await this.setupTwoFactorUseCase.execute({
        userId: id,
        method: req.body.method,
        deviceId: req.body.deviceId
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }

  async reportSecurityBreach(req: Request, res: Response): Promise<void> {
    try {
      if (!this.reportSecurityBreachUseCase) {
        res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
        return;
      }
      const result = await this.reportSecurityBreachUseCase.execute({
        userId: req.body.userId,
        breachType: req.body.breachType,
        severity: req.body.severity,
        details: req.body.details,
        reportedBy: req.headers['x-user-id'] as string
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed' } });
    }
  }
}
