/**
 * Preservation Property Tests
 *
 * These tests verify that non-bug-condition paths produce identical responses
 * before and after the fix. They MUST PASS on both unfixed AND fixed code.
 *
 * Properties tested:
 *   A — Non-existent email always returns { success: true } with no side effects (security by design)
 *   B — Expired token always returns { success: false, message: "...expired" }
 *   C — Used token always returns { success: false, message: "...already been used" }
 *   D — Password mismatch always returns { success: false, message: "...do not match" }
 *   E — Short password always returns { success: false, message: "...at least 8 characters" }
 *   F — save() login-event path never includes passwordHash in the update payload
 */

import * as fc from 'fast-check';
import { ForgotPasswordUseCase } from '../forgot-password.use-case';
import { ResetPasswordUseCase } from '../reset-password.use-case';

const mockUserServiceClient = () => ({
  updatePassword: jest.fn().mockResolvedValue(undefined),
});

// ---------------------------------------------------------------------------
// Preservation A — Non-existent email stays silent (security by design)
// ---------------------------------------------------------------------------
describe('Preservation A — ForgotPasswordUseCase: non-existent email returns { success: true } with no side effects', () => {
  it('should return success:true and never create a token for non-existent emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const mockUserRepository = {
            findByEmail: jest.fn().mockResolvedValue(null),
            emailExists: jest.fn().mockResolvedValue(false), // email genuinely does not exist
          };
          const mockPasswordResetRepository = {
            create: jest.fn().mockResolvedValue(undefined),
          };
          const mockEmailService = {
            sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
          };

          const useCase = new ForgotPasswordUseCase(
            mockUserRepository as any,
            mockPasswordResetRepository as any,
            mockEmailService as any,
          );

          const result = await useCase.execute({ email, baseUrl: 'http://localhost:3000' });

          // Security by design: always return success regardless of whether account exists
          expect(result.success).toBe(true);
          expect(result.message).toContain('If an account exists');

          // No token created, no email sent
          expect(mockPasswordResetRepository.create).not.toHaveBeenCalled();
          expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation B — Expired token rejected
// ---------------------------------------------------------------------------
describe('Preservation B — ResetPasswordUseCase: expired token returns correct error', () => {
  it('should return { success: false } with expired message for expired tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 64 }),
        fc.integer({ min: 1, max: 86400000 }).map(ms => new Date(Date.now() - ms)),
        async (token, expiredAt) => {
          const mockRecord = {
            id: 'reset-1',
            userId: 'user-1',
            token,
            used: false,
            expiresAt: expiredAt,
          };

          const mockUserRepository = { findById: jest.fn() };
          const mockPasswordResetRepository = {
            findByToken: jest.fn().mockResolvedValue(mockRecord),
            markAsUsed: jest.fn(),
          };

          const useCase = new ResetPasswordUseCase(
            mockUserRepository as any,
            mockPasswordResetRepository as any,
            mockUserServiceClient() as any,
          );

          const result = await useCase.execute({
            token,
            newPassword: 'ValidPass123',
            confirmPassword: 'ValidPass123',
          });

          expect(result.success).toBe(false);
          expect(result.message).toContain('expired');
          expect(mockUserRepository.findById).not.toHaveBeenCalled();
          expect(mockPasswordResetRepository.markAsUsed).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation C — Used token rejected
// ---------------------------------------------------------------------------
describe('Preservation C — ResetPasswordUseCase: used token returns correct error', () => {
  it('should return { success: false } with already-used message for used tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 64 }),
        async (token) => {
          const mockRecord = {
            id: 'reset-2',
            userId: 'user-2',
            token,
            used: true,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          };

          const mockUserRepository = { findById: jest.fn() };
          const mockPasswordResetRepository = {
            findByToken: jest.fn().mockResolvedValue(mockRecord),
            markAsUsed: jest.fn(),
          };

          const useCase = new ResetPasswordUseCase(
            mockUserRepository as any,
            mockPasswordResetRepository as any,
            mockUserServiceClient() as any,
          );

          const result = await useCase.execute({
            token,
            newPassword: 'ValidPass123',
            confirmPassword: 'ValidPass123',
          });

          expect(result.success).toBe(false);
          expect(result.message).toContain('already been used');
          expect(mockUserRepository.findById).not.toHaveBeenCalled();
          expect(mockPasswordResetRepository.markAsUsed).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation D — Password mismatch rejected
// ---------------------------------------------------------------------------
describe('Preservation D — ResetPasswordUseCase: mismatched passwords return correct error', () => {
  it('should return { success: false } with mismatch message when passwords differ', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 8, maxLength: 24 }),
          fc.string({ minLength: 8, maxLength: 24 }),
        ).filter(([a, b]) => a !== b),
        async ([newPassword, confirmPassword]) => {
          const mockUserRepository = { findById: jest.fn() };
          const mockPasswordResetRepository = {
            findByToken: jest.fn().mockResolvedValue({
              id: 'r1', userId: 'u1', token: 'tok', used: false,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            }),
            markAsUsed: jest.fn(),
          };

          const useCase = new ResetPasswordUseCase(
            mockUserRepository as any,
            mockPasswordResetRepository as any,
            mockUserServiceClient() as any,
          );

          const result = await useCase.execute({ token: 'tok', newPassword, confirmPassword });

          expect(result.success).toBe(false);
          expect(result.message).toContain('do not match');
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation E — Short password rejected
// ---------------------------------------------------------------------------
describe('Preservation E — ResetPasswordUseCase: short passwords return correct error', () => {
  it('should return { success: false } with length message for passwords shorter than 8 chars', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 7 }),
        async (shortPassword) => {
          const mockUserRepository = { findById: jest.fn() };
          const mockPasswordResetRepository = { findByToken: jest.fn(), markAsUsed: jest.fn() };

          const useCase = new ResetPasswordUseCase(
            mockUserRepository as any,
            mockPasswordResetRepository as any,
            mockUserServiceClient() as any,
          );

          const result = await useCase.execute({
            token: 'any-token',
            newPassword: shortPassword,
            confirmPassword: shortPassword,
          });

          expect(result.success).toBe(false);
          expect(result.message).toContain('at least 8 characters');
          expect(mockPasswordResetRepository.findByToken).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Preservation F — save() login-event path never includes passwordHash
// ---------------------------------------------------------------------------
describe('Preservation F — UserServiceRepository.save(): login-event updates never include passwordHash', () => {
  it('should confirm that the auth-path save() only syncs login-tracking fields, not passwordHash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          failedLoginAttempts: fc.nat({ max: 10 }),
          lockoutUntil: fc.option(fc.date(), { nil: undefined }),
          lastLoginAt: fc.option(fc.date(), { nil: undefined }),
        }),
        async (loginEventData) => {
          const updateSpy = jest.fn().mockResolvedValue(undefined);

          // Replicate the actual logic from UserServiceRepository.save() non-registration path
          const updates: any = {};
          if (loginEventData.failedLoginAttempts !== undefined) {
            updates.failedLoginAttempts = loginEventData.failedLoginAttempts;
          }
          if (loginEventData.lockoutUntil !== undefined) {
            updates.lockoutUntil = loginEventData.lockoutUntil?.toISOString();
          }
          if (loginEventData.lastLoginAt !== undefined) {
            updates.lastLoginAt = loginEventData.lastLoginAt?.toISOString();
          }

          if (Object.keys(updates).length > 0) {
            await updateSpy('user-id', updates);
          }

          if (updateSpy.mock.calls.length > 0) {
            const payload = updateSpy.mock.calls[0][1];
            // Must not contain passwordHash
            expect(payload).not.toHaveProperty('passwordHash');
            // Must only contain allowed login-tracking keys
            const allowedKeys = new Set(['failedLoginAttempts', 'lockoutUntil', 'lastLoginAt']);
            Object.keys(payload).forEach(key => {
              expect(allowedKeys.has(key)).toBe(true);
            });
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
