import { VerifyEmailUseCase } from '../verify-email.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserPolicies } from '../../../domain/policies/user-policies';
import { UserEmailVerifiedEvent } from '../../../domain/events';

function makeUser(id = 'u1', verified = false) {
  let u = User.create({
    id,
    email: Email.create(`${id}@example.com`),
    phoneNumber: PhoneNumber.create('+255712345678'),
    firstName: 'A',
    lastName: 'B',
    role: 'buyer'
  } as any);
  if (verified) u = u.verifyEmail();
  return u;
}

describe('VerifyEmailUseCase', () => {
  let repo: any;
  let publisher: any;
  let useCase: VerifyEmailUseCase;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      updateEmailVerification: jest.fn().mockResolvedValue(undefined),
      recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
    };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    useCase = new VerifyEmailUseCase(repo, publisher);
  });

  test('returns not found when user missing', async () => {
    repo.findById.mockResolvedValue(null);
    const out = await useCase.execute({ userId: 'x', verificationToken: 't' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  test('returns not allowed when policies forbid', async () => {
    const u = makeUser('u2');
    repo.findById.mockResolvedValue(u);
    jest.spyOn(UserPolicies, 'canVerifyUser').mockReturnValue({ allowed: false, reason: 'No' });

    const out = await useCase.execute({ userId: 'u2', verificationToken: 't' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('No');
  });

  test('returns already verified when user.emailVerified true', async () => {
    const u = makeUser('u3', true);
    repo.findById.mockResolvedValue(u);
    jest.spyOn(UserPolicies, 'canVerifyUser').mockReturnValue({ allowed: true });

    const out = await useCase.execute({ userId: 'u3', verificationToken: 't' });
    expect(out.success).toBe(true);
    expect(out.message).toContain('already verified');
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(repo.updateEmailVerification).not.toHaveBeenCalled();
  });

  test('invalid token path records failed attempt and returns failure', async () => {
    const u = makeUser('u4', false);
    repo.findById.mockResolvedValue(u);
    jest.spyOn(UserPolicies, 'canVerifyUser').mockReturnValue({ allowed: true });
    jest.spyOn(VerifyEmailUseCase.prototype as any, 'validateVerificationToken').mockResolvedValue(false);

    const out = await useCase.execute({ userId: 'u4', verificationToken: 'bad' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid or expired');
    expect(repo.recordSecurityEvent).toHaveBeenCalledWith('u4', expect.objectContaining({ action: 'email_verification', success: false }));
  });

  test('successful token verification updates repo and publishes event', async () => {
    const u = makeUser('u5', false);
    repo.findById.mockResolvedValue(u);
    jest.spyOn(UserPolicies, 'canVerifyUser').mockReturnValue({ allowed: true });
    jest.spyOn(VerifyEmailUseCase.prototype as any, 'validateVerificationToken').mockResolvedValue(true);
    jest.spyOn(VerifyEmailUseCase.prototype as any, 'markTokenAsUsed').mockResolvedValue(undefined);

    const out = await useCase.execute({ userId: 'u5', verificationToken: 'ok' });
    expect(out.success).toBe(true);
    expect(repo.updateEmailVerification).toHaveBeenCalledWith('u5', true);
    expect(publisher.publish).toHaveBeenCalledWith(expect.any(UserEmailVerifiedEvent));
  });

  test('admin verification skips token validation and publishes admin method', async () => {
    const u = makeUser('u6', false);
    repo.findById.mockResolvedValue(u);
    jest.spyOn(UserPolicies, 'canVerifyUser').mockReturnValue({ allowed: true });

    const out = await useCase.execute({ userId: 'u6', verificationToken: '', verifiedBy: 'admin1' });
    expect(out.success).toBe(true);
    expect(repo.updateEmailVerification).toHaveBeenCalledWith('u6', true);
    expect(publisher.publish).toHaveBeenCalledWith(expect.any(UserEmailVerifiedEvent));
    expect(out.verificationMethod).toBe('admin');
  });
});

