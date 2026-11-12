import { UserMapper } from '../../mappers/user-mapper';
import { UserRole } from '../../../domain/types/user.types';

describe('UserMapper', () => {
  it('sanitizes email and phone', () => {
    expect(UserMapper.sanitizeEmail(' Test@Example.COM ')).toBe('test@example.com');
    expect(UserMapper.sanitizePhoneNumber(' +255 712 345 678 ')).toBe('+255712345678');
  });

  it('maps CreateUserDto to User entity', () => {
    const dto: any = {
      email: 'test@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BUYER
    };

    const entity = UserMapper.toEntity(dto as any);
    expect(entity.firstName).toBe('John');
    expect(entity.email.value).toBe('test@example.com');
    expect(entity.phoneNumber.value).toBe('+255712345678');
    expect(entity.role).toBe(dto.role);
  });

  it('creates response dto and summary dto without throwing', () => {
    const dto: any = {
      email: 'test@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BUYER
    };

    const user = UserMapper.toEntity(dto);
    const resp = UserMapper.toResponseDto(user as any);
    const summary = UserMapper.toSummaryDto(user as any);

    expect(resp.id).toBeDefined();
    expect(summary.id).toBeDefined();
  });

  it('toDisplayNameDto maps a known user to { fullName, publicCode, role }', () => {
    const dto: any = {
      email: 'asha@example.com',
      phoneNumber: '+255712345678',
      firstName: 'Asha',
      lastName: 'Mwakalobo',
      role: UserRole.SELLER
    };

    const user = UserMapper.toEntity(dto, { publicCode: 'MYS-SLR-01' });
    const displayName = UserMapper.toDisplayNameDto(user as any);

    expect(displayName.fullName).toBe('Asha Mwakalobo');
    expect(displayName.publicCode).toBe('MYS-SLR-01');
    expect(displayName.role).toBe('seller');
  });

  it('toDisplayNameDto returns empty string for publicCode when undefined', () => {
    const dto: any = {
      email: 'buyer@example.com',
      phoneNumber: '+255712345678',
      firstName: 'Amina',
      lastName: 'Hassan',
      role: UserRole.BUYER
      // publicCode intentionally omitted
    };

    const user = UserMapper.toEntity(dto);
    const displayName = UserMapper.toDisplayNameDto(user as any);

    expect(displayName.publicCode).toBe('');
    expect(displayName.fullName).toBe('Amina Hassan');
    expect(displayName.role).toBe('buyer');
  });

  it('toDisplayNameDto normalizes role to lowercase regardless of input case', () => {
    // Simulate an uppercase role as might leak from auth-service sync
    const dto: any = {
      email: 'admin@example.com',
      phoneNumber: '+255712345678',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'ADMIN' as any
    };

    const user = UserMapper.toEntity(dto);
    const displayName = UserMapper.toDisplayNameDto(user as any);

    expect(displayName.role).toBe('admin');
  });

  it('toDisplayNameDto returns exactly the PII-minimal field set and nothing else', () => {
    const dto: any = {
      email: 'seller@example.com',
      phoneNumber: '+255712345678',
      firstName: 'Juma',
      lastName: 'Mussa',
      role: UserRole.SELLER
    };

    const user = UserMapper.toEntity(dto, { publicCode: 'MYS-SLR-02' });
    const displayName = UserMapper.toDisplayNameDto(user as any) as any;

    const keys = Object.keys(displayName).sort();
    expect(keys).toEqual(['fullName', 'publicCode', 'role'].sort());

    // No PII should be present on the display name DTO
    const piiFields = [
      'email', 'phoneNumber', 'dateOfBirth', 'passwordHash',
      'kycStatus', 'kycData', 'kycNationalId', 'addresses',
      'metadata', 'businessId', 'firstName', 'lastName',
      'status', 'emailVerified', 'phoneVerified'
    ];
    for (const pii of piiFields) {
      expect(keys).not.toContain(pii);
    }
  });
});