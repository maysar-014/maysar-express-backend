import { IUserRepository } from '../../domain/repositories/user.repository';
import { EventEnvelope, IEventPublisher, eventBus } from '../../../../../shared/events/eventBus';

interface AdminPermissionValidationRequestedData {
    adminId: string;
    action: string;
    targetUserId: string;
}

interface UserCreationRequestedData {
    userId: string;
    adminId: string;
    userData: unknown;
}

export class AuthEventHandlers {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly events: IEventPublisher = eventBus
    ) { }

    public registerHandlers(): void {
        eventBus.subscribe('AdminPermissionValidationRequested', {
            name: 'auth-permission-validation',
            handler: async (envelope: EventEnvelope) => {
                const data = envelope.data as AdminPermissionValidationRequestedData;
                const { adminId, action, targetUserId } = data;
                // Implementation...
            }
        });

        eventBus.subscribe('UserCreationRequested', {
            name: 'auth-user-creation',
            handler: async (envelope: EventEnvelope) => {
                const data = envelope.data as UserCreationRequestedData;
                const { userId, adminId, userData } = data;
                // Implementation...
            }
        });
    }
}
