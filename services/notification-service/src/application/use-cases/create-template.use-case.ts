import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import { INotificationTemplateRepository } from '../../domain/repositories';
import { NotificationValidationService } from '../../domain/services/notification-validation.service';
import { CreateTemplateDto } from '../dto/template.dto';
import { NotificationMapper } from '../mappers/notification-mapper';
import { NotificationValidationError, TemplateNotFoundError } from '../../domain/errors/notification.errors';

export class CreateTemplateUseCase {
  constructor(
    private templateRepository: INotificationTemplateRepository,
    private validationService: NotificationValidationService
  ) {}

  async execute(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    this.validateInput(dto);
    const template = NotificationMapper.templateToEntity(dto);
    this.validationService.validateTemplate(template);
    return this.templateRepository.create(template);
  }

  private validateInput(dto: CreateTemplateDto): void {
    if (!dto.name?.trim()) throw new NotificationValidationError('Template name is required');
    if (!dto.type?.trim()) throw new NotificationValidationError('Template type is required');
    if (!dto.channel) throw new NotificationValidationError('Channel is required');
    if (!dto.bodyTemplate?.trim()) throw new NotificationValidationError('Body template is required');
    if (!dto.createdBy?.trim()) throw new NotificationValidationError('CreatedBy is required');
  }
}
