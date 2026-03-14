import { AuthenticateUserUseCase } from '../authenticate-user.use-case';
import { UserStatus } from '../../../domain/entities/user.types';

// Mock dependencies
const mockUserRepository = {
    findByEmail: jest.fn(),
    save: jest.fn()
};

// Mock speakeasy
jest.mock('speakeasy', () => ({
    totp: {
        verify: jest.fn()
    }
}));

import * as speakeasy from 'speakeasy';

describe('AuthenticateUserUseCase', () => {
    let useCase: AuthenticateUserUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new AuthenticateUserUseCase(mockUserRepository as any);
    });

    const mockUser = (overrides = {}) => ({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed_password',
        status: UserStatus.ACTIVE,
        role: 'buyer',
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        ...overrides
    });

    describe('authentication', () => {
        it('should authenticate valid user', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser());

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.accessToken).toBeDefined();
        });

        it('should fail if user not found', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid email');
        });

        it('should fail safely when repository lookup throws', async () => {
            mockUserRepository.findByEmail.mockRejectedValue(new Error('user-service unavailable'));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid email or password');
        });

        it('should fail if password incorrect', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser());

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'wrongpassword',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
        });
    });

    describe('account status checks', () => {
        it('should fail if account inactive', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({ status: 'SUSPENDED' }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        it('should fail if account locked', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({
                lockoutUntil: new Date(Date.now() + 100000)
            }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.locked).toBe(true);
        });

        it('should fail if account deactivated', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({ status: 'DEACTIVATED' }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });
    });

    describe('two-factor authentication', () => {
        it('should require 2FA if enabled', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({
                twoFactorEnabled: true,
                twoFactorSecret: 'secret'
            }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.requiresTwoFactor).toBe(true);
        });

        it('should validate 2FA code', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({
                twoFactorEnabled: true,
                twoFactorSecret: 'secret'
            }));
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                totpCode: '123456',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(true);
        });

        it('should fail invalid 2FA code', async () => {
            const user = mockUser({
                twoFactorEnabled: true,
                twoFactorSecret: 'secret'
            });
            mockUserRepository.findByEmail.mockResolvedValue(user);
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                totpCode: '000000',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid two-factor');
            expect(mockUserRepository.save).toHaveBeenCalled();
        });
    });

    describe('failed login attempts', () => {
        it('should increment failed attempts on wrong password', async () => {
            const user = mockUser({ failedLoginAttempts: 2 });
            mockUserRepository.findByEmail.mockResolvedValue(user);

            await useCase.execute({
                email: 'test@example.com',
                password: 'wrongpassword',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(mockUserRepository.save).toHaveBeenCalled();
        });

        it('should lock account after max failed attempts', async () => {
            const user = mockUser({ failedLoginAttempts: 4 });
            mockUserRepository.findByEmail.mockResolvedValue(user);

            await useCase.execute({
                email: 'test@example.com',
                password: 'wrongpassword',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(mockUserRepository.save).toHaveBeenCalled();
        });

        it('should reset failed attempts on successful login', async () => {
            const user = mockUser({ failedLoginAttempts: 2 });
            mockUserRepository.findByEmail.mockResolvedValue(user);

            await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(mockUserRepository.save).toHaveBeenCalled();
        });
    });

    describe('role and permission checks', () => {
        it('should authenticate buyer role', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({ role: 'buyer' }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(true);
            expect(result.user.role).toBe('buyer');
        });

        it('should authenticate seller role', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({ role: 'seller' }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(true);
            expect(result.user.role).toBe('seller');
        });

        it('should authenticate admin role', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser({ role: 'admin' }));

            const result = await useCase.execute({
                email: 'test@example.com',
                password: 'password',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });

            expect(result.success).toBe(true);
            expect(result.user.role).toBe('admin');
        });
    });
});
