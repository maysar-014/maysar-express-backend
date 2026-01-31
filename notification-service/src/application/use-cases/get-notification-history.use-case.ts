import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { NotificationSearchDto } from '../dto/notification.dto';
import { NotificationMapper } from '../mappers/notification-mapper';
import { NotificationSearchCriteria } from '../../domain/repositories';

export interface GetNotificationHistoryResult {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class GetNotificationHistoryUseCase {
  constructor(private notificationRepository: INotificationRepository) {}

  async execute(criteria: NotificationSearchDto): Promise<GetNotificationHistoryResult> {
    const page = Math.max(1, criteria.page ?? 1);
    const limit = Math.min(100, Math.max(1, criteria.limit ?? 20));
    const offset = (page - 1) * limit;

    const searchCriteria: NotificationSearchCriteria = {
      userId: criteria.userId,
      status: criteria.status,
      channel: criteria.channel,
      from: criteria.from,
      to: criteria.to,
      limit,
      offset
    };

    const items = await this.notificationRepository.search(searchCriteria);
    const total = items.length;
    const hasMore = items.length === limit;

    return {
      items,
      total,
      page,
      limit,
      hasMore
    };
  }
}
