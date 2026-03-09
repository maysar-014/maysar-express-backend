import {
  BusinessValidationError,
  BusinessAlreadyExistsError,
  BusinessNotFoundError,
  InvalidRegistrationNumberError,
  BusinessSuspendedError,
  UnauthorizedBusinessOperationError
} from './business.errors';

describe('business.errors', () => {
  it('creates typed error instances with expected names/messages', () => {
    const validation = new BusinessValidationError('validation failed');
    const exists = new BusinessAlreadyExistsError('already exists');
    const notFound = new BusinessNotFoundError('not found');
    const invalidReg = new InvalidRegistrationNumberError('invalid registration');
    const suspended = new BusinessSuspendedError('business suspended');
    const unauthorized = new UnauthorizedBusinessOperationError('unauthorized');

    expect(validation).toBeInstanceOf(Error);
    expect(validation.name).toBe('BusinessValidationError');
    expect(validation.message).toBe('validation failed');

    expect(exists.name).toBe('BusinessAlreadyExistsError');
    expect(notFound.name).toBe('BusinessNotFoundError');
    expect(invalidReg.name).toBe('InvalidRegistrationNumberError');
    expect(suspended.name).toBe('BusinessSuspendedError');
    expect(unauthorized.name).toBe('UnauthorizedBusinessOperationError');
  });
});
