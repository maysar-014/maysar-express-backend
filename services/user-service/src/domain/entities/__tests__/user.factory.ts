import { User, UserRole, UserStatus } from '../user.entity';
import { Email } from '../../value-objects/email.value-object';
import { PhoneNumber } from '../../value-objects/phone-number.value-object';
import { v4 as uuid } from 'uuid';

/**
 * User Factory for testing
 * Follows Maysar Testing Constitution - Section 4.2
 */
export const UserFactory = {
    /**
     * Create a realistic User entity for testing
     */
    create: (overrides: Partial<any> = {}): User => {
        const defaultId = uuid();
        const firstName = overrides.firstName || 'Test';
        const lastName = overrides.lastName || `User-${defaultId.slice(0, 4)}`;
        const email = overrides.email ?
            (typeof overrides.email === 'string' ? Email.create(overrides.email) : overrides.email) :
            Email.create(`user-${defaultId.slice(0, 8)}@example.com`);

        const phoneNumber = overrides.phoneNumber ?
            (typeof overrides.phoneNumber === 'string' ? PhoneNumber.create(overrides.phoneNumber) : overrides.phoneNumber) :
            PhoneNumber.create('+2557' + Math.floor(10000000 + Math.random() * 90000000));

        return User.create({
            id: overrides.id || defaultId,
            email,
            phoneNumber,
            firstName,
            lastName,
            role: overrides.role || UserRole.BUYER,
            dateOfBirth: overrides.dateOfBirth || new Date(1990, 0, 1),
            metadata: overrides.metadata || {
                accountAge: 1,
                loginAttempts: 0
            },
            preferredLanguage: overrides.preferredLanguage || 'en',
            preferredCurrency: overrides.preferredCurrency || 'USD',
            ...overrides
        });
    },

    /**
     * Create an admin User
     */
    createAdmin: (overrides: Partial<any> = {}): User => {
        return UserFactory.create({
            role: UserRole.SYSTEM,
            firstName: 'Admin',
            ...overrides
        });
    }
};
