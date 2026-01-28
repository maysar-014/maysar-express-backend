import { UserMapper } from '../../mappers/user-mapper';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { Address } from '../../../domain/value-objects/address.value-object';
import { User } from '../../../domain/entities/user.entity';
import { UserRole } from '../../../domain/types/user.types';

describe('UserMapper - comprehensive', () => {
  const email = Email.create('mapper@test.com');
  const phone = PhoneNumber.create('+255712345678');
  const addressObj = {
    id: 'addr1',
    userId: 'u1',
    type: 'shipping',
    isPrimary: true,
    street: '1 Test Ave',
    city: 'Dar es Salaam',
    state: 'DSM',
    postalCode: '11111',
    country: 'Tanzania',
    coordinates: { latitude: -6.7924, longitude: 39.2083 },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const address = Address.create(addressObj as any);

  const user = User.create({
    id: 'u1',
    email,
    phoneNumber: phone,
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: new Date('1990-01-01'),
    role: UserRole.BUYER,
    metadata: { accountAge: 5, loginAttempts: 1 },
    preferredLanguage: 'en',
    preferredCurrency: 'USD',
    addresses: [address]
  });

  test('toResponseDto and toSummaryDto include expected properties', () => {
    const resp = UserMapper.toResponseDto(user);
    expect(resp.id).toBe(user.id);
    expect(resp.fullName).toBe('Test User');
    expect(resp.email).toBe('mapper@test.com');

    const summ = UserMapper.toSummaryDto(user);
    expect(summ.fullName).toBe('Test User');
    expect(summ.email).toBe('mapper@test.com');
  });

  test('toAuthDto and toActivityDto and toVerificationDto and toPreferencesDto', () => {
    const auth = UserMapper.toAuthDto(user);
    expect(auth.id).toBe(user.id);

    const activity = UserMapper.toActivityDto(user, [{ timestamp: new Date(), action: 'login' }]);
    expect(activity.loginCount).toBe(user.metadata.accountAge);
    expect(activity.isActive).toBe(user.isActive());

    const verify = UserMapper.toVerificationDto(user);
    expect(verify.userId).toBe(user.id);

    const prefs = UserMapper.toPreferencesDto(user);
    expect(prefs.userId).toBe(user.id);
    expect(prefs.privacy.emailVisible).toBe(user.emailVerified);
  });

  test('updateProfileFromDto and updateMetadataFromDto', () => {
    const updated = UserMapper.updateProfileFromDto(user, { firstName: 'New' } as any);
    expect(updated.firstName).toBe('New');

    const meta = UserMapper.updateMetadataFromDto(user, { loginAttempts: 3 } as any);
    expect(meta.metadata.loginAttempts).toBe(3);
  });

  test('address helpers and removal', () => {
    const withAdded = UserMapper.addAddressFromDto(user, { type: 'billing', isPrimary: false, street: 'X', city: 'Y', postalCode: '1', country: 'Tanzania' } as any);
    expect(withAdded.addresses.length).toBeGreaterThanOrEqual(1);

    expect(withAdded.addresses).toBeDefined();
    const firstAddrId = (withAdded.addresses! as any)[0].getId();
    const removed = UserMapper.removeAddress(withAdded, firstAddrId);
    expect(Array.isArray(removed.addresses)).toBe(true);
  });

  test('sanitizers and utility helpers', () => {
    expect(UserMapper.sanitizeEmail(' A@B.COM ')).toBe('a@b.com');
    expect(UserMapper.sanitizePhoneNumber('+255 712 345 678')).toBe('+255712345678');
    expect(UserMapper.sanitizeName('  Foo   Bar  ')).toBe('Foo Bar');

    expect(UserMapper.isBusinessUser(user)).toBe(false);
    expect(UserMapper.getPrimaryAddress(user)).toBeDefined();
    expect(UserMapper.getTanzanianAddresses(user).length).toBeGreaterThan(0);

    const age = UserMapper.calculateAge(user.dateOfBirth);
    expect(typeof age).toBe('number');
    expect(UserMapper.isAdult(user)).toBe(true);

    expect(UserMapper.canPerformBusinessOperations(user)).toBe(false);
    expect(UserMapper.getUserRiskLevel(user)).toBe('low');
    expect(UserMapper.isAccountLocked(user)).toBe(false);
    expect(typeof UserMapper.getTimeUntilUnlock(user)).toBe('number');
  });
});
