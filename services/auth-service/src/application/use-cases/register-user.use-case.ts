import { IUserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { IEventPublisher, eventBus } from '../../../../../shared/events/eventBus';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterUserRequest {
    email: string;
    role: string;
    profile: any;
}

export class RegisterUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly events: IEventPublisher = eventBus
    ) { }

    async execute(request: RegisterUserRequest): Promise<string> {
        const existing = await this.userRepository.findByEmail(request.email);
        if (existing) {
            throw new Error('User already exists');
        }

        const user = User.create({
            id: uuidv4(),
            email: request.email,
            role: request.role,
            status: 'PENDING_VERIFICATION',
            profile: request.profile
        });

        await this.userRepository.save(user);

        await this.events.publish('UserRegistered.v1', {
            userId: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile
        });

        return user.id;
    }
}
