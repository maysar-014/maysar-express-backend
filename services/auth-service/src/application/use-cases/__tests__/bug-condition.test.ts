/**
 * Bug Condition Exploration Tests
 *
 * These tests encode the EXPECTED (fixed) behavior.
 * Sub-test A fails on unfixed code (Bug 1 confirmation).
 * Sub-test B passes on both unfixed and fixed code because it now asserts on
 * userServiceClient.updatePassword, which is the correct fix path.
 *
 * Bug 1 — ForgotPasswordUseCase silent skip:
 *   Counterexample: emailExists is never called on unfixed code — the `if (user)` guard
 *   silently skips when findByEmail returns null, without checking emailExists.
 *
 * Bug 2 — ResetPasswordUseCase passwordHash not persisted (FIXED):
 *   After fix: userServiceClient.updatePassword is called with the correct hash.
 *   The raw (user as any).passwordHash mutation + userRepository.save() path is gone.
 */

import * as fc from 'fast-check';
import { ForgotPasswordUseCase } from '../forgot-password.use-case';
import { ResetPasswordUseCase } from '../reset-password.use-case';

// ---------------------------------------------------------------------------
// Sub-test A — Bug 1: findByEmail null causes silent skip in ForgotPasswordUseCase
// ---------------------------------------------------------------------------
describe('Bug Condition A — ForgotPasswordUseCase: findByEmail null silently skips token creation', () => {
  it('should call emailExists when findByEmail returns null for a confirmed-existent email', async () => {
    // On UNFIXED code: emailExists is NEVER called (fails assertion below).
    // On FIXED code: emailExists IS called, then error is thrown surfacing the failure.
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const mockUserRepository = {
            findByEmail: jest.fn().mockResolvedValue(null),  // bug condition: returns null
            emailExists: jest.fn().mockResolvedValue(true), // email confirmed to exist
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

          try {
            await useCase.execute({ email, baseUrl: 'http://localhost:3000' });
          } catch {
            // Fixed code throws when emailExists=true but findByEmail=null — this is correct
          }

          // On unfixed code: emailExists is never called → this assertion FAILS
          // On fixed code: emailExists IS called → passes
          expect(mockUserRepository.emailExists).toHaveBeenCalledWith(email);
        },
      ),
      { numRuns: 5 },
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-test B — Bug 2: ResetPasswordUseCase now calls userServiceClient.updatePassword
// ---------------------------------------------------------------------------
describe('Bug Condition B — ResetPasswordUseCase: userServiceClient.updatePassword is called with the new hash', () => {
  it('should call userServiceClient.updatePassword with the hashed new password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 32 }).filter(s => s.trim().length >= 8),
        async (newPassword) => {
          const tokenValue = 'valid-token-abc123';
          const userId = 'user-100';

          const mockRecord = {
            id: 'reset-record-1',
            userId,
            token: tokenValue,
            used: false,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          };

          const mockUser = {
            id: userId,
            email: 'user@example.com',
            changePassword: jest.fn(),
          };

          const updatePasswordSpy = jest.fn().mockResolvedValue(undefined);

          const mockUserRepository = {
            findById: jest.fn().mockResolvedValue(mockUser),
          };
          const mockPasswordResetRepository = {
            findByToken: jest.fn().mockResolvedValue(mockRecord),
            markAsUsed: jest.fn().mockResolvedValue(undefined),
          };
          const mockUserServiceClient = {
            updatePassword: updatePasswordSpy,
          };

          const useCase = new ResetPasswordUseCase(
            mockUserRepository as any,
            mockPasswordResetRepository as any,
            mockUserServiceClient as any,
          );

          const result = await useCase.execute({
            token: tokenValue,
            newPassword,
            confirmPassword: newPassword,
          });

          expect(result.success).toBe(true);

          // userServiceClient.updatePassword must be called with (userId, bcryptHash)
          expect(updatePasswordSpy).toHaveBeenCalledTimes(1);
          const [calledUserId, calledHash] = updatePasswordSpy.mock.calls[0];
          expect(calledUserId).toBe(userId);
          expect(typeof calledHash).toBe('string');
          expect(calledHash.startsWith('$2')).toBe(true); // bcrypt hash prefix

          // changePassword domain method must be used (not raw mutation)
          expect(mockUser.changePassword).toHaveBeenCalledTimes(1);

          // markAsUsed must be called
          expect(mockPasswordResetRepository.markAsUsed).toHaveBeenCalledWith('reset-record-1');
        },
      ),
      { numRuns: 3 }, // bcrypt is slow; keep numRuns low
    );
  });
});
