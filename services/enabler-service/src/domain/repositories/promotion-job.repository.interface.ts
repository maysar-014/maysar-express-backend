import { PromotionJobEntity } from '../entities/promotion-job.entity';

export interface PromotionJobQuery {
  sellerId?: string;
  status?: 'ACTIVE' | 'SCHEDULED';
  page?: number;
  limit?: number;
  excludeIds?: string[];
}

export interface PromotionJobPage {
  items: PromotionJobEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IPromotionJobRepository {
  findById(id: string): Promise<PromotionJobEntity | null>;
  findMarketplaceJobs(query?: PromotionJobQuery): Promise<PromotionJobPage>;
}
