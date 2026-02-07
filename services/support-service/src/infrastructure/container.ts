import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '../types';
import { eventBus } from '@shared/events/eventBus';

// Repositories
import { ITicketRepository, ISupportAgentRepository, ITicketMessageRepository, ITicketStatusHistoryRepository, ITicketAttachmentRepository } from '../domain/repositories/interfaces';
import { PrismaTicketRepository } from './repositories/prisma-ticket.repository';
import { PrismaSupportAgentRepository } from './repositories/prisma-support-agent.repository';
import { PrismaTicketMessageRepository } from './repositories/prisma-ticket-message.repository';
import { PrismaTicketStatusHistoryRepository } from './repositories/prisma-ticket-status-history.repository';
import { PrismaTicketAttachmentRepository } from './repositories/prisma-ticket-attachment.repository';

// Use Cases
import { CreateTicketUseCase } from '../application/use-cases/create-ticket.use-case';
import { AssignTicketUseCase } from '../application/use-cases/assign-ticket.use-case';
import { UpdateTicketStatusUseCase } from '../application/use-cases/update-ticket-status.use-case';
import { AddMessageUseCase } from '../application/use-cases/add-message.use-case';
import { ResolveTicketUseCase } from '../application/use-cases/resolve-ticket.use-case';
import { CloseTicketUseCase } from '../application/use-cases/close-ticket.use-case';
import { GetTicketUseCase } from '../application/use-cases/get-ticket.use-case';
import { ListTicketsUseCase } from '../application/use-cases/list-tickets.use-case';
import { AutoAssignTicketUseCase } from '../application/use-cases/auto-assign-ticket.use-case';
import { CreateAgentUseCase, UpdateAgentUseCase } from '../application/use-cases/agent-management.use-case';

// Policies
import { TicketAssignmentPolicy } from '../domain/policies/ticket-assignment.policy';
import { TicketEscalationPolicy } from '../domain/policies/ticket-escalation.policy';

// Messaging
import { SupportEventPublisher } from './messaging/support-event-publisher';
import { SupportEventSubscriber } from './messaging/support-event-subscriber';

// Controllers
import { TicketController } from '../api/controllers/ticket.controller';
import { AgentController } from '../api/controllers/agent.controller';

const container = new Container();

import { prisma } from './database/prisma-client';

// Core
container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(prisma);
container.bind(TYPES.EventBus).toConstantValue(eventBus);

// Repositories
container.bind<ITicketRepository>(TYPES.ITicketRepository).to(PrismaTicketRepository).inSingletonScope();
container.bind<ITicketMessageRepository>(TYPES.ITicketMessageRepository).to(PrismaTicketMessageRepository).inSingletonScope();
container.bind<ITicketStatusHistoryRepository>(TYPES.ITicketStatusHistoryRepository).to(PrismaTicketStatusHistoryRepository).inSingletonScope();
container.bind<ITicketAttachmentRepository>(TYPES.ITicketAttachmentRepository).to(PrismaTicketAttachmentRepository).inSingletonScope();
container.bind<ISupportAgentRepository>(TYPES.ISupportAgentRepository).to(PrismaSupportAgentRepository).inSingletonScope();

// Policies
container.bind<TicketAssignmentPolicy>(TYPES.TicketAssignmentPolicy).to(TicketAssignmentPolicy).inSingletonScope();
container.bind<TicketEscalationPolicy>(TYPES.TicketEscalationPolicy).to(TicketEscalationPolicy).inSingletonScope();

// Use Cases
container.bind<CreateTicketUseCase>(TYPES.CreateTicketUseCase).to(CreateTicketUseCase).inSingletonScope();
container.bind<AssignTicketUseCase>(TYPES.AssignTicketUseCase).to(AssignTicketUseCase).inSingletonScope();
container.bind<UpdateTicketStatusUseCase>(TYPES.UpdateTicketStatusUseCase).to(UpdateTicketStatusUseCase).inSingletonScope();
container.bind<AddMessageUseCase>(TYPES.AddMessageUseCase).to(AddMessageUseCase).inSingletonScope();
container.bind<ResolveTicketUseCase>(TYPES.ResolveTicketUseCase).to(ResolveTicketUseCase).inSingletonScope();
container.bind<CloseTicketUseCase>(TYPES.CloseTicketUseCase).to(CloseTicketUseCase).inSingletonScope();
container.bind<GetTicketUseCase>(TYPES.GetTicketUseCase).to(GetTicketUseCase).inSingletonScope();
container.bind<ListTicketsUseCase>(TYPES.ListTicketsUseCase).to(ListTicketsUseCase).inSingletonScope();
container.bind<AutoAssignTicketUseCase>(TYPES.AutoAssignTicketUseCase).to(AutoAssignTicketUseCase).inSingletonScope();
container.bind<CreateAgentUseCase>(TYPES.CreateAgentUseCase).to(CreateAgentUseCase).inSingletonScope();
container.bind<UpdateAgentUseCase>(TYPES.UpdateAgentUseCase).to(UpdateAgentUseCase).inSingletonScope();

// Messaging
container.bind<SupportEventPublisher>(TYPES.SupportEventPublisher).to(SupportEventPublisher).inSingletonScope();
container.bind<SupportEventSubscriber>(TYPES.SupportEventSubscriber).to(SupportEventSubscriber).inSingletonScope();

// Controllers
container.bind<TicketController>(TYPES.TicketController).to(TicketController).inSingletonScope();
container.bind<AgentController>(TYPES.AgentController).to(AgentController).inSingletonScope();

export { container };
