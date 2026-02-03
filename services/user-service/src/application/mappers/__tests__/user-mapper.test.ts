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
});