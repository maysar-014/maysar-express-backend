import { IUserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { v4 as uuidv4 } from 'uuid';
import { makeId } from '@shared/ids/id';
import { generatePublicUserCode } from '@shared/ids/public-codes';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object';

export interface RegisterUserRequest {
    email: string;
    password: string;
    role?: string;
    profile?: any;
    allowPrivilegedRole?: boolean;
    userId?: string;
    phoneNumber?: string;
    phone?: string;
}

export interface RegisterUserResult {
    userId: string;
    otp: string;
    phoneNumber?: string;
}

export class RegisterUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository
    ) { }

    async execute(request: RegisterUserRequest): Promise<RegisterUserResult> {
        const existing = await this.userRepository.findByEmail(request.email);
        if (existing) {
            const err = new Error('User already exists');
            err.name = 'UserAlreadyExistsError';
            throw err;
        }

        const requestedRole =
            typeof request.role === 'string' ? request.role.trim().toLowerCase() : '';

        // Roles that any user can self-register with (no privileged flag required).
        // 'system' and 'admin' are privileged and require allowPrivilegedRole=true.
        const SELF_REGISTERABLE_ROLES = new Set(['buyer', 'seller', 'supplier', 'courier', 'enabler']);

        // Normalise 'admin' → 'system' since 'admin' is an alias used by seeds/tools
        // but the canonical privileged role in auth_users is 'system'.
        const normalizedRequestedRole = requestedRole === 'admin' ? 'system' : requestedRole;

        const allowPrivilegedRole = request.allowPrivilegedRole === true;

        let primaryRole: string;
        let roles: string[];
        let extraFields: Record<string, any> = {};

        if (allowPrivilegedRole && normalizedRequestedRole) {
            primaryRole = normalizedRequestedRole;
            roles = [primaryRole];
        } else {
            primaryRole = 'buyer';
            if (normalizedRequestedRole && normalizedRequestedRole !== 'buyer') {
                roles = ['buyer', normalizedRequestedRole];
                extraFields = { requestedRole: normalizedRequestedRole };
            } else {
                roles = ['buyer'];
            }
        }

        const incomingProfile =
            request.profile && typeof request.profile === 'object' ? request.profile : {};
        const { roles: _ignoreRoles, requestedRole: _ignoreRequestedRole, ...safeProfile } = incomingProfile;

        // Generate 6-digit phone verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const resolvedPhoneNumber =
            (request.profile?.phoneNumber ?? request.phoneNumber ?? request.phone) || undefined;

        const normalizedProfile = {
            ...safeProfile,
            roles,
            ...extraFields,
            ...(resolvedPhoneNumber ? { phoneNumber: resolvedPhoneNumber } : {}),
            phoneOtp: otp,
            phoneOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        };

        const user = User.create({
            id: allowPrivilegedRole && typeof request.userId === 'string' && request.userId.trim()
                ? request.userId.trim()
                : makeId('usr'),
            publicCode: generatePublicUserCode(),
            email: request.email,
            role: primaryRole,
            status: 'PENDING_VERIFICATION',
            profile: normalizedProfile
        });

        user.changePassword(await PasswordHash.fromPlainPassword(request.password));

        await this.userRepository.save(user);

        // Print OTP prominently to the backend shell output for development
        /* eslint-disable no-console */
        console.log('\n===============================================================');
        console.log(`[DEVELOPMENT PHONE OTP] New User Registered: ${user.email}`);
        console.log(`[DEVELOPMENT PHONE OTP] Phone Number: ${resolvedPhoneNumber || 'N/A'}`);
        console.log(`[DEVELOPMENT PHONE OTP] Verification Code (OTP): ${otp}`);
        console.log('===============================================================\n');

        const envelope: EventEnvelope = {
            eventId: uuidv4(),
            eventType: 'UserRegistered.v1',
            data: {
                userId: user.id,
                publicCode: user.publicCode,
                email: user.email,
                role: user.role,
                profile: user.profile,
                phoneNumber: resolvedPhoneNumber,
                otp
            },
            timestamp: new Date()
        };
        await eventBus.publish(envelope);

        // Ensure we return the persisted user ID from user-service if available.
        const persisted = await this.userRepository.findByEmail(request.email);
        const finalUserId = persisted?.id || user.id;

        return {
            userId: finalUserId,
            otp,
            phoneNumber: resolvedPhoneNumber
        };
    }
}
