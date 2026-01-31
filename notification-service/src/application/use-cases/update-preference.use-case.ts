import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { UpdatePreferenceDto } from '../dto/preference.dto';
import { NotificationMapper } from '../mappers/notification-mapper';
import { PreferenceNotFoundError, NotificationValidationError } from '../../domain/errors/notification.errors';

export class UpdatePreferenceUseCase {
  constructor(private preferenceRepository: INotificationPreferenceRepository) {}

  async execute(userId: string, channel: string, dto: UpdatePreferenceDto): Promise<NotificationPreference> {
    const existing = await this.preferenceRepository.findByUserAndChannel(userId, channel);
    if (!existing) {
      throw new PreferenceNotFoundError(`Preference not found for user ${userId} and channel ${channel}`);
    }
    const updated = NotificationMapper.preferenceUpdateFromDto(existing, dto);
    return this.preferenceRepository.update(updated);
  }
}
