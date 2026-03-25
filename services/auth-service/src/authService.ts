import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { AuthController } from './api/controllers/auth.controller';
import { AuthEventHandlers } from './infrastructure/events/auth.event-handlers';
import { UserSyncEventHandlers } from './infrastructure/events/user-sync.event-handlers';
import { AuthEventPublisher } from './infrastructure/messaging/auth-event-publisher';
import { OutboxRepository } from '@shared/outbox/outbox.repository';
import { createPrismaClient } from '@shared/database/prisma-client';

const app = express();
const prisma = createPrismaClient();
const authOutboxRepository = new OutboxRepository(prisma, 'sharedOutboxEvent');
const authEventPublisher = new AuthEventPublisher(authOutboxRepository);
app.use(express.json());

// Wire Dependencies
const userRepository = new PrismaUserRepository(prisma);
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const authenticateUserUseCase = new AuthenticateUserUseCase(userRepository as any, authEventPublisher);
const authController = new AuthController(registerUserUseCase, authenticateUserUseCase);
const eventHandlers = new AuthEventHandlers(userRepository);
const userSyncHandlers = new UserSyncEventHandlers(prisma);

// Initialize Event Handlers
eventHandlers.registerHandlers();
userSyncHandlers.registerHandlers();

// API Routes
app.post('/api/auth/register', (req, res) => authController.register(req, res));

// ... other routes migrated to controllers

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Module running on port ${PORT}`));

export default app;
