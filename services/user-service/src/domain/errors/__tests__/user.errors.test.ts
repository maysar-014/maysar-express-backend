import {
  UserValidationError,
  UserAlreadyExistsError,
  UserNotFoundError,
  UserAuthenticationError,
  UserAuthorizationError,
  UserAccountLockedError,
  UserAccountSuspendedError,
  UserAccountInactiveError,
  UserVerificationError,
  UserBusinessValidationError,
  UserRiskAssessmentError
} from '../user.errors';

describe('User domain errors', () => {
  test('each error has correct name and message', () => {
    const errs = [
      { cls: UserValidationError, name: 'UserValidationError' },
      { cls: UserAlreadyExistsError, name: 'UserAlreadyExistsError' },
      { cls: UserNotFoundError, name: 'UserNotFoundError' },
      { cls: UserAuthenticationError, name: 'UserAuthenticationError' },
      { cls: UserAuthorizationError, name: 'UserAuthorizationError' },
      { cls: UserAccountLockedError, name: 'UserAccountLockedError' },
      { cls: UserAccountSuspendedError, name: 'UserAccountSuspendedError' },
      { cls: UserAccountInactiveError, name: 'UserAccountInactiveError' },
      { cls: UserVerificationError, name: 'UserVerificationError' },
      { cls: UserBusinessValidationError, name: 'UserBusinessValidationError' },
      { cls: UserRiskAssessmentError, name: 'UserRiskAssessmentError' }
    ];

    errs.forEach(({ cls, name }) => {
      const instance = new cls('test message');
      expect(instance).toBeInstanceOf(Error);
      expect(instance.name).toBe(name);
      expect(instance.message).toBe('test message');
    });
  });
});
