import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from './types';
import { ICampaignRepository } from './domain/repositories/campaign.repository.interface';
import { PrismaCampaignRepository } from './infrastructure/repositories/prisma-campaign.repository';
import { CreateCampaignUseCase } from './application/use-cases/create-campaign.use-case';
import { ScheduleCampaignUseCase } from './application/use-cases/schedule-campaign.use-case';
import { LaunchCampaignUseCase } from './application/use-cases/launch-campaign.use-case';
import { PauseCampaignUseCase } from './application/use-cases/pause-campaign.use-case';
import { ResumeCampaignUseCase } from './application/use-cases/resume-campaign.use-case';
import { CancelCampaignUseCase } from './application/use-cases/cancel-campaign.use-case';
import { CompleteCampaignUseCase } from './application/use-cases/complete-campaign.use-case';
import { GetCampaignUseCase } from './application/use-cases/get-campaign.use-case';
import { ListCampaignsUseCase } from './application/use-cases/list-campaigns.use-case';
import { UpdateCampaignUseCase } from './application/use-cases/update-campaign.use-case';
import { LoggerService } from './infrastructure/services/logger.service';
import { EventPublisherService } from './infrastructure/services/event-publisher.service';
import { CampaignController } from './api/controllers/campaign.controller';
import { ProductDeletedHandler } from './application/handlers/product-deleted.handler';
import { CategoryDeletedHandler } from './application/handlers/category-deleted.handler';

const container = new Container();

// Controllers
container.bind<CampaignController>(TYPES.CampaignController).to(CampaignController);

// Infrastructure
container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());
container.bind<LoggerService>(LoggerService).toSelf().inSingletonScope();
container.bind<EventPublisherService>(TYPES.EventPublisher).to(EventPublisherService).inSingletonScope();

// Repositories
container.bind<ICampaignRepository>(TYPES.CampaignRepository).to(PrismaCampaignRepository).inSingletonScope();

// Use Cases
container.bind<CreateCampaignUseCase>(TYPES.CreateCampaignUseCase).to(CreateCampaignUseCase);
container.bind<ScheduleCampaignUseCase>(TYPES.ScheduleCampaignUseCase).to(ScheduleCampaignUseCase);
container.bind<LaunchCampaignUseCase>(TYPES.LaunchCampaignUseCase).to(LaunchCampaignUseCase);
container.bind<PauseCampaignUseCase>(TYPES.PauseCampaignUseCase).to(PauseCampaignUseCase);
container.bind<ResumeCampaignUseCase>(TYPES.ResumeCampaignUseCase).to(ResumeCampaignUseCase);
container.bind<CancelCampaignUseCase>(TYPES.CancelCampaignUseCase).to(CancelCampaignUseCase);
container.bind<CompleteCampaignUseCase>(TYPES.CompleteCampaignUseCase).to(CompleteCampaignUseCase);
container.bind<GetCampaignUseCase>(TYPES.GetCampaignUseCase).to(GetCampaignUseCase);
container.bind<ListCampaignsUseCase>(TYPES.ListCampaignsUseCase).to(ListCampaignsUseCase);
container.bind<UpdateCampaignUseCase>(TYPES.UpdateCampaignUseCase).to(UpdateCampaignUseCase);

// Event Handlers
container.bind<ProductDeletedHandler>(TYPES.ProductDeletedHandler).to(ProductDeletedHandler).inSingletonScope();
container.bind<CategoryDeletedHandler>(TYPES.CategoryDeletedHandler).to(CategoryDeletedHandler).inSingletonScope();

export { container };
