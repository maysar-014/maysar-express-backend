import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { AuthController } from './api/controllers/auth.controller';
import { AuthEventHandlers } from './infrastructure/events/auth.event-handlers';

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// Wire Dependencies
const userRepository = new PrismaUserRepository(prisma);
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const authenticateUserUseCase = new AuthenticateUserUseCase();
const authController = new AuthController(registerUserUseCase, authenticateUserUseCase);
const eventHandlers = new AuthEventHandlers(userRepository);

// Initialize Event Handlers
eventHandlers.registerHandlers();

// API Routes
app.post('/api/auth/register', (req, res) => authController.register(req, res));

// ... other routes migrated to controllers

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Module running on port ${PORT}`));

export default app;
