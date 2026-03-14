import { IUserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterUserRequest {
    email: string;
    role?: string;
    profile?: any;
}

export class RegisterUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository
    ) { }

    async execute(request: RegisterUserRequest): Promise<string> {
        const existing = await this.userRepository.findByEmail(request.email);
        if (existing) {
            throw new Error('User already exists');
        }

        const primaryRole = 'buyer';
        const requestedRole =
            typeof request.role === 'string' ? request.role.trim().toLowerCase() : '';
        const additionalRoles =
            requestedRole && requestedRole !== primaryRole ? [requestedRole] : [];

        const incomingProfile =
            request.profile && typeof request.profile === 'object' ? request.profile : {};
        const { roles: _ignoreRoles, requestedRole: _ignoreRequestedRole, ...safeProfile } = incomingProfile;
        const normalizedProfile = {
            ...safeProfile,
            roles: [primaryRole, ...additionalRoles],
            ...(additionalRoles.length > 0 ? { requestedRole } : {})
        };

        const user = User.create({
            id: uuidv4(),
            email: request.email,
            role: primaryRole,
            status: 'PENDING_VERIFICATION',
            profile: normalizedProfile
        });

        await this.userRepository.save(user);

        const envelope: EventEnvelope = {
            eventId: uuidv4(),
            eventType: 'UserRegistered.v1',
            data: {
                userId: user.id,
                email: user.email,
                role: user.role,
                profile: user.profile
            },
            timestamp: new Date()
        };
        await eventBus.publish(envelope);

        return user.id;
    }
}
