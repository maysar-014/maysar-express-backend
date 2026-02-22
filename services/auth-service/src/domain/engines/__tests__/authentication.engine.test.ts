import { AuthenticationEngine } from '../authentication.engine';
import { User, UserRole } from '../../entities/user.entity';
import { AuthenticationPolicy } from '../../policies/authentication.policy';
import { PasswordHash } from '../../value-objects/password-hash.value-object';
import { Email } from '../../value-objects/email.value-object';

describe('AuthenticationEngine', () => {
    let passwordHash: PasswordHash;

    beforeEach(async () => {
        passwordHash = await PasswordHash.fromPlainPassword('password123');
        jest.spyOn(AuthenticationPolicy, 'canAuthenticate').mockReturnValue(true);
        jest.spyOn(AuthenticationPolicy, 'canChangePassword').mockReturnValue(true);
        jest.spyOn(AuthenticationPolicy, 'canResetPassword').mockReturnValue(true);
        jest.spyOn(AuthenticationPolicy, 'canManageUsers').mockReturnValue(true);
        jest.spyOn(AuthenticationPolicy, 'canChangeUserRole').mockReturnValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('authenticateUser', () => {
        it('should authenticate valid user', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.authenticateUser(user, 'password123');

            expect(result.success).toBe(true);
        });

        it('should fail if password invalid', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.authenticateUser(user, 'wrongpassword');

            expect(result.success).toBe(false);
        });

        it('should block locked account', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER,
                lockoutUntil: new Date(Date.now() + 100000)
            });

            const result = await AuthenticationEngine.authenticateUser(user, 'password123');

            expect(result.success).toBe(false);
            expect(result.locked).toBe(true);
        });

        it('should require 2FA if enabled', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER,
                twoFactorEnabled: true,
                twoFactorSecret: 'secret'
            });

            const result = await AuthenticationEngine.authenticateUser(user, 'password123');

            expect(result.success).toBe(false);
            expect(result.requiresTwoFactor).toBe(true);
        });

        it('should validate 2FA code', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER,
                twoFactorEnabled: true,
                twoFactorSecret: 'secret'
            });

            const result = await AuthenticationEngine.authenticateUser(user, 'password123', '123456');

            expect(result.success).toBe(true);
        });

        it('should block authentication when policy denies', async () => {
            jest.spyOn(AuthenticationPolicy, 'canAuthenticate').mockReturnValue(false);
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.authenticateUser(user, 'password123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.changePassword(user, 'password123', 'newPassword456');

            expect(result.success).toBe(true);
        });

        it('should fail if current password incorrect', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.changePassword(user, 'wrongpassword', 'newPassword456');

            expect(result.success).toBe(false);
            expect(result.message).toContain('incorrect');
        });

        it('should fail if new password same as current', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.changePassword(user, 'password123', 'password123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('different');
        });

        it('should fail when policy denies', async () => {
            jest.spyOn(AuthenticationPolicy, 'canChangePassword').mockReturnValue(false);
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = await AuthenticationEngine.changePassword(user, 'password123', 'newPassword456');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });
    });

    describe('initiatePasswordReset', () => {
        it('should initiate password reset successfully', () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = AuthenticationEngine.initiatePasswordReset(user);

            expect(result.success).toBe(true);
            expect(result.resetToken).toBeDefined();
            expect(result.expiresAt).toBeDefined();
        });

        it('should fail when policy denies', () => {
            jest.spyOn(AuthenticationPolicy, 'canResetPassword').mockReturnValue(false);
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = AuthenticationEngine.initiatePasswordReset(user);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });
            const expiresAt = new Date(Date.now() + 100000);

            const result = await AuthenticationEngine.resetPassword(user, 'token', 'newPassword456', expiresAt);

            expect(result.success).toBe(true);
        });

        it('should fail if token expired', async () => {
            const user = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });
            const expiresAt = new Date(Date.now() - 100000);

            const result = await AuthenticationEngine.resetPassword(user, 'token', 'newPassword456', expiresAt);

            expect(result.success).toBe(false);
            expect(result.message).toContain('expired');
        });
    });

    describe('manageAccountStatus', () => {
        it('should suspend user account', () => {
            const manager = User.create({
                id: 'admin-1',
                email: Email.create('admin@example.com'),
                passwordHash,
                role: UserRole.ADMIN
            });
            const target = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = AuthenticationEngine.manageAccountStatus(manager, target, 'suspend');

            expect(result.success).toBe(true);
        });

        it('should reactivate user account', () => {
            const manager = User.create({
                id: 'admin-1',
                email: Email.create('admin@example.com'),
                passwordHash,
                role: UserRole.ADMIN
            });
            const target = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER,
                status: 'SUSPENDED'
            });

            const result = AuthenticationEngine.manageAccountStatus(manager, target, 'reactivate');

            expect(result.success).toBe(true);
        });

        it('should unlock user account', () => {
            const manager = User.create({
                id: 'admin-1',
                email: Email.create('admin@example.com'),
                passwordHash,
                role: UserRole.ADMIN
            });
            const target = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER,
                lockoutUntil: new Date(Date.now() + 100000)
            });

            const result = AuthenticationEngine.manageAccountStatus(manager, target, 'unlock');

            expect(result.success).toBe(true);
        });

        it('should fail when policy denies', () => {
            jest.spyOn(AuthenticationPolicy, 'canManageUsers').mockReturnValue(false);
            const manager = User.create({
                id: 'user-2',
                email: Email.create('user2@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });
            const target = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = AuthenticationEngine.manageAccountStatus(manager, target, 'suspend');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Insufficient permissions');
        });
    });

    describe('changeUserRole', () => {
        it('should change user role successfully', () => {
            const changer = User.create({
                id: 'admin-1',
                email: Email.create('admin@example.com'),
                passwordHash,
                role: UserRole.ADMIN
            });
            const target = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = AuthenticationEngine.changeUserRole(changer, target, UserRole.SELLER);

            expect(result.success).toBe(true);
        });

        it('should fail when policy denies', () => {
            jest.spyOn(AuthenticationPolicy, 'canChangeUserRole').mockReturnValue(false);
            const changer = User.create({
                id: 'user-2',
                email: Email.create('user2@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });
            const target = User.create({
                id: 'user-1',
                email: Email.create('test@example.com'),
                passwordHash,
                role: UserRole.BUYER
            });

            const result = AuthenticationEngine.changeUserRole(changer, target, UserRole.SELLER);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Insufficient permissions');
        });
    });
});
