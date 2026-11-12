import './user.dto';
import { UserRole, UserStatus, type Address as AddressType } from '../../domain/types/user.types';
import { Address } from '../../domain/value-objects/address.value-object';
import type {
  AddAddressDto,
  AuthUserDto,
  BulkUserOperationDto,
  CreateUserDto,
  DisplayNameDto,
  ResolveNamesRequestDto,
  UserPreferencesDto,
  UserResponseDto,
  UserSearchDto
} from './user.dto';

describe('user.dto', () => {
  const makeAddress = (): Address => {
    const value: AddressType = {
      id: 'addr-1',
      userId: 'user-1',
      type: 'shipping',
      isPrimary: true,
      street: 'Samora Ave',
      city: 'Dar es Salaam',
      state: 'DSM',
      postalCode: '11101',
      country: 'Tanzania',
      coordinates: { latitude: -6.8, longitude: 39.28 },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    };

    return Address.create(value);
  };

  it('supports create/search/response dto type contracts', () => {
    const address = makeAddress();
    const createDto: CreateUserDto = {
      email: 'seller@example.com',
      phoneNumber: '+255712345678',
      firstName: 'Amina',
      lastName: 'Juma',
      role: UserRole.SELLER,
      addresses: [address]
    };
    const searchDto: UserSearchDto = {
      email: 'seller@example.com',
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      sortOrder: 'asc',
      page: 1,
      limit: 20
    };
    const responseDto: UserResponseDto = {
      id: 'user-1',
      email: createDto.email,
      phoneNumber: createDto.phoneNumber,
      firstName: createDto.firstName,
      lastName: createDto.lastName,
      fullName: 'Amina Juma',
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
      preferredLanguage: 'en',
      preferredCurrency: 'TZS',
      addresses: [address],
      metadata: {
        accountAge: 10,
        loginAttempts: 0
      },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    };

    expect(createDto.addresses?.[0].toString()).toContain('Samora Ave');
    expect(searchDto.status).toBe(UserStatus.ACTIVE);
    expect(responseDto.fullName).toBe('Amina Juma');
  });

  it('supports auxiliary dto types for auth, preferences, address and bulk operations', () => {
    const address = makeAddress();
    const addAddressDto: AddAddressDto = {
      type: 'shipping',
      isPrimary: false,
      street: 'Nyerere Rd',
      city: 'Dodoma',
      postalCode: '41103',
      country: 'Tanzania'
    };
    const authDto: AuthUserDto = {
      id: 'user-1',
      email: 'buyer@example.com',
      firstName: 'Sara',
      lastName: 'Ali',
      fullName: 'Sara Ali',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      phoneVerified: true,
      preferredLanguage: 'sw',
      preferredCurrency: 'TZS',
      addresses: [address]
    };
    const bulkDto: BulkUserOperationDto = {
      userIds: ['user-1', 'user-2'],
      operation: 'activate',
      reason: 'manual review complete'
    };
    const preferences: UserPreferencesDto = {
      userId: 'user-1',
      preferredLanguage: 'en',
      preferredCurrency: 'TZS',
      notifications: { email: true, sms: true, push: false, marketing: false },
      privacy: {
        profileVisible: true,
        emailVisible: false,
        phoneVisible: false,
        locationVisible: false
      },
      theme: {
        darkMode: false,
        fontSize: 'medium',
        layout: 'comfortable'
      }
    };

    expect(addAddressDto.city).toBe('Dodoma');
    expect(authDto.addresses[0].isPrimary()).toBe(true);
    expect(bulkDto.userIds).toHaveLength(2);
    expect(preferences.notifications.sms).toBe(true);
  });

  it('supports name resolution request and display name dtos with PII-minimal shape', () => {
    const requestDto: ResolveNamesRequestDto = {
      ids: ['usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'usr_02BZ4CDEKTSV4RRFFQ69G5FAV']
    };
    const displayDto: DisplayNameDto = {
      fullName: 'Asha Mwakalobo',
      publicCode: 'MYS-SLR-01',
      role: 'seller'
    };

    expect(requestDto.ids).toHaveLength(2);
    expect(requestDto.ids[0]).toBe('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(displayDto.fullName).toBe('Asha Mwakalobo');
    expect(displayDto.publicCode).toBe('MYS-SLR-01');
    expect(displayDto.role).toBe('seller');
  });

  it('DisplayNameDto exposes exactly { fullName, publicCode, role } and no PII fields', () => {
    const displayDto: DisplayNameDto = {
      fullName: 'Juma Mussa',
      publicCode: 'MYS-SLR-02',
      role: 'seller'
    };

    const keys = Object.keys(displayDto).sort();
    expect(keys).toEqual(['fullName', 'publicCode', 'role'].sort());

    // PII fields that must never appear on this DTO
    const piiFields = [
      'email', 'phoneNumber', 'dateOfBirth', 'passwordHash',
      'kycStatus', 'kycData', 'kycNationalId', 'addresses',
      'metadata', 'businessId', 'firstName', 'lastName'
    ];
    for (const pii of piiFields) {
      expect(keys).not.toContain(pii);
    }
  });

  it('supports ResolveNamesRequestDto with an ids array', () => {
    const requestDto: ResolveNamesRequestDto = {
      ids: ['user-1', 'user-2', 'user-3']
    };

    expect(requestDto.ids).toHaveLength(3);
  });

  it('supports DisplayNameDto with exactly fullName, publicCode and role', () => {
    const displayDto: DisplayNameDto = {
      fullName: 'Amina Juma',
      publicCode: 'MYS-SLR-01',
      role: 'seller'
    };

    expect(displayDto.fullName).toBe('Amina Juma');
    expect(displayDto.publicCode).toBe('MYS-SLR-01');
    expect(displayDto.role).toBe('seller');
    expect(Object.keys(displayDto).sort()).toEqual(['fullName', 'publicCode', 'role'].sort());
  });
});
